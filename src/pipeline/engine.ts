import type { SqliteDb } from "../db/index.js";
import type { DfConfig, Buildplan } from "../types/index.js";
import type { AgentRuntime } from "../runtime/interface.js";
import { createRun, getRun, updateRunStatus, updateRunPhase, incrementRunIteration } from "../db/queries/runs.js";
import { getSpec, updateSpecStatus, updateSpecHash } from "../db/queries/specs.js";
import { getActiveAgents } from "../db/queries/agents.js";
import { getActiveBuildplan } from "../db/queries/buildplans.js";
import { createEvent } from "../db/queries/events.js";
import { getNextPhase, shouldSkipPhase, PHASE_ORDER } from "./phases.js";
import type { PhaseName } from "./phases.js";
import { getResumePoint, getCompletedModules } from "./resume.js";
import type { ResumeOptions } from "./resume.js";
import { checkBudget } from "./budget.js";
import { log } from "../utils/logger.js";
import { getArchitectPrompt } from "../agents/prompts/architect.js";
import { getEvaluatorPrompt } from "../agents/prompts/evaluator.js";

// Extracted module imports
import { sendInstructions } from "./instructions.js";
import { executeAgentPhase } from "./agent-lifecycle.js";
import { sendInstructions as sendInstructionsFn } from "./instructions.js";
import { executeBuildPhase, executeResumeBuildPhase } from "./build-phase.js";
import { executeMergePhase } from "./merge-phase.js";
import { preBuildValidation, updateSpecStatusChecked, computeContentHash } from "./build-guards.js";

export class PipelineEngine {
  constructor(
    private db: SqliteDb,
    private runtime: AgentRuntime,
    private config: DfConfig,
  ) {}

  /**
   * Execute the full pipeline for a spec.
   * Creates a run, walks through phases, spawns agents, polls for completion.
   */
  async execute(specId: string, options?: { skipChangeEval?: boolean; budget?: number; skipArchitect?: boolean; force?: boolean }): Promise<string> {
    const spec = getSpec(this.db, specId);
    if (!spec) throw new Error(`Spec not found: ${specId}`);

    // Pre-build validation: status check and content hash check
    const validation = preBuildValidation(this.db, specId, spec.file_path, options?.force ?? false);
    if (!validation.allowed) {
      throw new Error(validation.error ?? validation.warning ?? "Build validation failed");
    }

    // Store content hash before build starts
    try {
      const hash = computeContentHash(spec.file_path);
      updateSpecHash(this.db, specId, hash);
    } catch {
      // If file can't be read for hashing, continue anyway
    }

    // Transition spec to building status (if not already building)
    if (spec.status !== "building") {
      try {
        updateSpecStatusChecked(this.db, specId, "building");
      } catch {
        // If transition fails (e.g., already building from retry), continue
      }
    }

    const skipChangeEval = options?.skipChangeEval ?? false;
    const budget = options?.budget ?? this.config.build.budget_usd;

    const run = createRun(this.db, {
      spec_id: specId,
      skip_change_eval: skipChangeEval,
      max_parallel: this.config.build.max_parallel,
      budget_usd: budget,
      max_iterations: this.config.build.max_iterations,
    });

    createEvent(this.db, run.id, "run-created", { specId, skipChangeEval, budget });
    updateRunStatus(this.db, run.id, "running");
    createEvent(this.db, run.id, "run-started");

    log.info(`Pipeline started: ${run.id} for spec ${specId}`);
    console.log(`[dark] Pipeline orchestrating agents for spec ${specId}. Do NOT write code yourself — agents handle implementation.`);

    const context: Record<string, unknown> = {
      skip_architect: options?.skipArchitect ?? false,
      skip_change_eval: skipChangeEval,
      module_count: 0,
    };

    try {
      // Walk through phases
      for (const phaseName of PHASE_ORDER) {
        if (shouldSkipPhase(phaseName, context)) {
          log.info(`Skipping phase: ${phaseName}`);
          continue;
        }

        updateRunPhase(this.db, run.id, phaseName);
        createEvent(this.db, run.id, "phase-started", { phase: phaseName });
        log.info(`Phase: ${phaseName}`);

        await this.executePhase(run.id, phaseName, context);

        createEvent(this.db, run.id, "phase-completed", { phase: phaseName });

        // Update context after architect phase
        if (phaseName === "architect" || phaseName === "plan-review") {
          const bp = getActiveBuildplan(this.db, specId);
          if (bp) {
            const plan: Buildplan = JSON.parse(bp.plan);
            context.module_count = plan.modules.length;
          }
        }

        // Budget check
        const budget = checkBudget(this.db, run.id);
        if (budget.overBudget) {
          log.warn(`Budget exceeded: $${budget.spentUsd.toFixed(2)} / $${budget.budgetUsd.toFixed(2)}`);
        }
      }

      // Count results
      const agents = getActiveAgents(this.db, run.id);
      const completedCount = this.db.prepare(
        "SELECT COUNT(*) as cnt FROM agents WHERE run_id = ? AND status = 'completed'"
      ).get(run.id) as { cnt: number };

      updateRunStatus(this.db, run.id, "completed");

      // Transition spec to completed on successful pipeline
      try {
        updateSpecStatusChecked(this.db, specId, "completed");
      } catch {
        // Non-fatal: spec status update failure shouldn't break the pipeline
      }

      createEvent(this.db, run.id, "run-completed");
      log.success(`Pipeline completed: ${run.id}`);
      console.log(`[dark] Pipeline complete. ${completedCount.cnt} agents finished. Review with: git diff`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      updateRunStatus(this.db, run.id, "failed", error);

      // Roll back spec status to draft on pipeline failure
      try {
        updateSpecStatusChecked(this.db, specId, "draft");
      } catch {
        // Non-fatal: spec status rollback failure shouldn't mask the original error
      }

      createEvent(this.db, run.id, "run-failed", { error });
      log.error(`Pipeline failed: ${error}`);
      console.log(`[dark] Pipeline failed: ${error}. Check details: dark status --run-id ${run.id}. Do NOT attempt manual implementation.`);
    }

    return run.id;
  }

  /**
   * Resume a previously failed or stale run.
   * Returns run ID on success. Throws if not resumable.
   * Emits run-resumed event. Resets status to running.
   * Walks PHASE_ORDER from resume point. Pre-populates completedModules for build phase.
   *
   * Contract: engine.resume
   */
  async resume(options: ResumeOptions): Promise<string> {
    const { runId, fromPhase, budgetUsd } = options;

    const run = getRun(this.db, runId);
    if (!run) throw new Error(`Run not found: ${runId}`);

    // Check resumability: only failed or stale running runs
    if (run.status === "completed") {
      throw new Error(`Run ${runId} is not resumable: status is 'completed'`);
    }
    if (run.status === "cancelled") {
      throw new Error(`Run ${runId} is not resumable: status is 'cancelled'`);
    }

    // If currently "running", check for active agents — can't resume while agents are live
    if (run.status === "running") {
      const activeAgents = getActiveAgents(this.db, runId);
      const liveAgents = [];
      for (const agent of activeAgents) {
        const runtimeStatus = await this.runtime.status(agent.id);
        if (runtimeStatus === "running") {
          liveAgents.push(agent);
        }
      }
      if (liveAgents.length > 0) {
        throw new Error(
          `Run ${runId} has ${liveAgents.length} active agents still running. Cannot resume.`
        );
      }
    }

    // Update budget if provided
    if (budgetUsd !== undefined) {
      this.db.prepare("UPDATE runs SET budget_usd = ?, updated_at = ? WHERE id = ?")
        .run(budgetUsd, new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), runId);
    }

    // Determine resume point
    const resumePhase = fromPhase ?? getResumePoint(this.db, runId);

    // Reset run status to running and emit run-resumed event
    updateRunStatus(this.db, runId, "running");
    createEvent(this.db, runId, "run-resumed", { fromPhase: resumePhase });

    log.info(`Pipeline resuming: ${runId} from phase '${resumePhase}'`);
    console.log(`[dark] Pipeline resuming run ${runId} from phase '${resumePhase}'.`);

    // Get completed modules from previous attempts (for build phase optimization)
    const previouslyCompletedModules = getCompletedModules(this.db, runId);

    const context: Record<string, unknown> = {
      skip_architect: false,
      skip_change_eval: run.skip_change_eval,
      module_count: 0,
      completedModules: previouslyCompletedModules,
    };

    // If resuming past architect, load module count from existing buildplan
    const spec = getSpec(this.db, run.spec_id);
    if (spec) {
      const bp = getActiveBuildplan(this.db, run.spec_id);
      if (bp) {
        const plan: Buildplan = JSON.parse(bp.plan);
        context.module_count = plan.modules.length;
      }
    }

    // Find the starting index in PHASE_ORDER
    const startIdx = PHASE_ORDER.indexOf(resumePhase);
    if (startIdx === -1) {
      throw new Error(`Invalid resume phase: ${resumePhase}`);
    }

    try {
      // Walk through phases starting from resume point
      for (let i = startIdx; i < PHASE_ORDER.length; i++) {
        const phaseName = PHASE_ORDER[i];

        if (shouldSkipPhase(phaseName, context)) {
          log.info(`Skipping phase: ${phaseName}`);
          continue;
        }

        updateRunPhase(this.db, runId, phaseName);
        createEvent(this.db, runId, "phase-started", { phase: phaseName });
        log.info(`Phase: ${phaseName}`);

        if (phaseName === "build" && previouslyCompletedModules.size > 0) {
          // Use the resume-aware build phase that skips completed modules
          await executeResumeBuildPhase(this.db, this.runtime, this.config, runId, previouslyCompletedModules);
        } else {
          await this.executePhase(runId, phaseName, context);
        }

        createEvent(this.db, runId, "phase-completed", { phase: phaseName });

        // Update context after architect phase
        if (phaseName === "architect" || phaseName === "plan-review") {
          const bp = getActiveBuildplan(this.db, run.spec_id);
          if (bp) {
            const plan: Buildplan = JSON.parse(bp.plan);
            context.module_count = plan.modules.length;
          }
        }

        // Budget check
        const budget = checkBudget(this.db, runId);
        if (budget.overBudget) {
          log.warn(`Budget exceeded: $${budget.spentUsd.toFixed(2)} / $${budget.budgetUsd.toFixed(2)}`);
        }
      }

      // Count results
      const completedCount = this.db.prepare(
        "SELECT COUNT(*) as cnt FROM agents WHERE run_id = ? AND status = 'completed'"
      ).get(runId) as { cnt: number };

      updateRunStatus(this.db, runId, "completed");
      createEvent(this.db, runId, "run-completed");
      log.success(`Pipeline resumed and completed: ${runId}`);
      console.log(`[dark] Pipeline complete. ${completedCount.cnt} agents finished. Review with: git diff`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      updateRunStatus(this.db, runId, "failed", error);
      createEvent(this.db, runId, "run-failed", { error });
      log.error(`Pipeline failed: ${error}`);
      console.log(`[dark] Pipeline failed: ${error}. Check details: dark status --run-id ${runId}. Do NOT attempt manual implementation.`);
    }

    return runId;
  }

  /**
   * Execute a single pipeline phase.
   */
  private async executePhase(runId: string, phase: PhaseName, context: Record<string, unknown>): Promise<void> {
    const run = getRun(this.db, runId)!;

    switch (phase) {
      case "scout":
        await this.executeScoutPhase(runId);
        break;

      case "architect": {
        const spec = getSpec(this.db, run.spec_id);
        const specFilePath = spec?.file_path ?? "";

        await executeAgentPhase(this.db, this.runtime, runId, "architect", (agentId) =>
          getArchitectPrompt({ specId: run.spec_id, runId, agentId, specFilePath }),
          { specFilePath },
          sendInstructionsFn,
        );
        break;
      }

      case "plan-review":
        log.info("Plan review: auto-approved");
        break;

      case "build":
        await executeBuildPhase(this.db, this.runtime, this.config, runId);
        break;

      case "integrate":
        await executeAgentPhase(this.db, this.runtime, runId, "integration-tester", (agentId) =>
          getEvaluatorPrompt({ specId: run.spec_id, runId, agentId, scenarioIds: [], mode: "functional" }),
          {},
          sendInstructionsFn,
        );
        break;

      case "evaluate-functional":
        await executeAgentPhase(this.db, this.runtime, runId, "evaluator", (agentId) =>
          getEvaluatorPrompt({ specId: run.spec_id, runId, agentId, scenarioIds: [], mode: "functional" }),
          {},
          sendInstructionsFn,
        );
        break;

      case "evaluate-change":
        await executeAgentPhase(this.db, this.runtime, runId, "evaluator", (agentId) =>
          getEvaluatorPrompt({ specId: run.spec_id, runId, agentId, scenarioIds: [], mode: "change" }),
          {},
          sendInstructionsFn,
        );
        break;

      case "merge": {
        await executeMergePhase(this.db, this.runtime, this.config, runId,
          async (rId, role, getPrompt, ctx) => {
            await executeAgentPhase(this.db, this.runtime, rId, role, getPrompt, ctx ?? {}, sendInstructionsFn);
          },
        );
        break;
      }
    }
  }

  /**
   * Scout phase: gather codebase context (lightweight, orchestrator-driven).
   */
  private async executeScoutPhase(runId: string): Promise<void> {
    log.info("Scout phase: loading project expertise...");
    // In a full implementation, this would spawn an orchestrator sub-task
    // to map the codebase and populate .df/expertise/
    createEvent(this.db, runId, "phase-completed", { phase: "scout", note: "auto-complete" });
  }

  async advancePhase(runId: string): Promise<void> {
    const run = getRun(this.db, runId);
    if (!run) throw new Error(`Run not found: ${runId}`);
    if (!run.current_phase) throw new Error("Run has no current phase");

    const next = getNextPhase(run.current_phase as PhaseName);
    if (!next) {
      updateRunStatus(this.db, runId, "completed");
      return;
    }

    updateRunPhase(this.db, runId, next);
    createEvent(this.db, runId, "phase-started", { phase: next });
  }

  async handlePhaseFailure(runId: string, phase: string, error: string): Promise<void> {
    const run = getRun(this.db, runId);
    if (!run) throw new Error(`Run not found: ${runId}`);

    createEvent(this.db, runId, "phase-failed", { phase, error });

    if (run.iteration < run.max_iterations) {
      incrementRunIteration(this.db, runId);
      updateRunPhase(this.db, runId, "build");
      createEvent(this.db, runId, "phase-started", { phase: "build", iteration: run.iteration + 1 });
      log.info(`Iteration ${run.iteration + 1}: retrying from build phase`);
    } else {
      updateRunStatus(this.db, runId, "failed", `Max iterations reached. Last error: ${error}`);
      createEvent(this.db, runId, "run-failed", { error, iterations: run.iteration });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
