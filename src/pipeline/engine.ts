import type { SqliteDb } from "../db/index.js";
import type { DfConfig, Buildplan } from "../types/index.js";
import type { AgentRuntime } from "../runtime/interface.js";
import { createRun, getRun, updateRunStatus, updateRunPhase, incrementRunIteration } from "../db/queries/runs.js";
import { getSpec } from "../db/queries/specs.js";
import { createAgent, updateAgentPid, updateAgentStatus, getActiveAgents, getStaleAgents } from "../db/queries/agents.js";
import { getActiveBuildplan } from "../db/queries/buildplans.js";
import { createEvent } from "../db/queries/events.js";
import { getNextPhase, shouldSkipPhase, PHASE_ORDER } from "./phases.js";
import type { PhaseName } from "./phases.js";
import { getReadyModules } from "./scheduler.js";
import { checkBudget } from "./budget.js";
import { log } from "../utils/logger.js";
import { getOrchestratorPrompt } from "../agents/prompts/orchestrator.js";
import { getArchitectPrompt } from "../agents/prompts/architect.js";
import { getBuilderPrompt } from "../agents/prompts/builder.js";
import { getEvaluatorPrompt } from "../agents/prompts/evaluator.js";
import { getMergerPrompt } from "../agents/prompts/merger.js";

const POLL_INTERVAL_MS = 5_000;

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
  async execute(specId: string, options?: { mode?: string; budget?: number; skipArchitect?: boolean }): Promise<string> {
    const spec = getSpec(this.db, specId);
    if (!spec) throw new Error(`Spec not found: ${specId}`);

    const mode = (options?.mode ?? this.config.build.default_mode) as "quick" | "thorough";
    const budget = options?.budget ?? this.config.build.budget_usd;

    const run = createRun(this.db, {
      spec_id: specId,
      mode,
      max_parallel: this.config.build.max_parallel,
      budget_usd: budget,
      max_iterations: this.config.build.max_iterations,
    });

    createEvent(this.db, run.id, "run-created", { specId, mode, budget });
    updateRunStatus(this.db, run.id, "running");
    createEvent(this.db, run.id, "run-started");

    log.info(`Pipeline started: ${run.id} for spec ${specId}`);

    const context: Record<string, unknown> = {
      skip_architect: options?.skipArchitect ?? false,
      mode,
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

      updateRunStatus(this.db, run.id, "completed");
      createEvent(this.db, run.id, "run-completed");
      log.success(`Pipeline completed: ${run.id}`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      updateRunStatus(this.db, run.id, "failed", error);
      createEvent(this.db, run.id, "run-failed", { error });
      log.error(`Pipeline failed: ${error}`);
    }

    return run.id;
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

      case "architect":
        await this.executeAgentPhase(runId, "architect", (agentId) =>
          getArchitectPrompt({ specId: run.spec_id, runId, agentId }),
        );
        break;

      case "plan-review":
        // Auto-approve for now (manual review can be added later)
        log.info("Plan review: auto-approved");
        break;

      case "build":
        await this.executeBuildPhase(runId);
        break;

      case "integrate":
        await this.executeAgentPhase(runId, "integration-tester", (agentId) =>
          getEvaluatorPrompt({ specId: run.spec_id, runId, agentId, scenarioIds: [], mode: "functional" }),
        );
        break;

      case "evaluate-functional":
        await this.executeAgentPhase(runId, "evaluator", (agentId) =>
          getEvaluatorPrompt({ specId: run.spec_id, runId, agentId, scenarioIds: [], mode: "functional" }),
        );
        break;

      case "evaluate-change":
        await this.executeAgentPhase(runId, "evaluator", (agentId) =>
          getEvaluatorPrompt({ specId: run.spec_id, runId, agentId, scenarioIds: [], mode: "change" }),
        );
        break;

      case "merge":
        await this.executeAgentPhase(runId, "merger", (agentId) =>
          getMergerPrompt({ runId, agentId, targetBranch: this.config.project.branch, worktreePaths: [] }),
        );
        break;
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

  /**
   * Spawn a single agent for a phase and wait for it to complete.
   */
  private async executeAgentPhase(
    runId: string,
    role: "architect" | "evaluator" | "merger" | "integration-tester",
    getPrompt: (agentId: string) => string,
  ): Promise<void> {
    const agent = createAgent(this.db, {
      run_id: runId,
      role,
      name: `${role}-${Date.now()}`,
      system_prompt: "pending",
    });

    const prompt = getPrompt(agent.id);
    // Update system prompt after we have the agent ID
    this.db.prepare("UPDATE agents SET system_prompt = ? WHERE id = ?").run(prompt, agent.id);

    createEvent(this.db, runId, "agent-spawned", { role }, agent.id);

    const handle = await this.runtime.spawn({
      run_id: runId,
      role,
      name: agent.name,
      system_prompt: prompt,
    });

    updateAgentPid(this.db, agent.id, handle.pid);

    // Poll until agent completes
    await this.waitForAgent(agent.id);
  }

  /**
   * Build phase: spawn builders per buildplan, respecting dependency DAG.
   */
  private async executeBuildPhase(runId: string): Promise<void> {
    const run = getRun(this.db, runId)!;
    const bp = getActiveBuildplan(this.db, run.spec_id);

    if (!bp) {
      // No buildplan — spawn a single builder
      log.info("No buildplan found, spawning single builder");
      await this.executeAgentPhase(runId, "architect" as any, (agentId) =>
        getBuilderPrompt({
          specId: run.spec_id, runId, agentId,
          moduleId: "main", contracts: [], worktreePath: ".",
        }),
      );
      return;
    }

    const plan: Buildplan = JSON.parse(bp.plan);
    const completedModules = new Set<string>();
    const activeBuilders = new Map<string, string>(); // agentId -> moduleId

    while (completedModules.size < plan.modules.length) {
      // Find modules ready to build
      const ready = getReadyModules(plan.modules, plan.dependencies, completedModules)
        .filter((id) => !activeBuilders.has(id) && ![...activeBuilders.values()].includes(id));

      // Spawn builders up to max_parallel
      const activeCount = (await this.runtime.listActive()).length;
      const slotsAvailable = this.config.build.max_parallel - activeCount;

      for (const moduleId of ready.slice(0, slotsAvailable)) {
        const mod = plan.modules.find((m) => m.id === moduleId)!;
        const agent = createAgent(this.db, {
          run_id: runId,
          role: "builder",
          name: `builder-${moduleId}`,
          module_id: moduleId,
          buildplan_id: bp.id,
          system_prompt: getBuilderPrompt({
            specId: run.spec_id, runId, agentId: "",
            moduleId, contracts: [], worktreePath: ".",
          }),
        });

        createEvent(this.db, runId, "builder-started", { moduleId }, agent.id);

        const handle = await this.runtime.spawn({
          run_id: runId,
          role: "builder",
          name: agent.name,
          module_id: moduleId,
          buildplan_id: bp.id,
          system_prompt: agent.system_prompt!,
        });

        updateAgentPid(this.db, agent.id, handle.pid);
        activeBuilders.set(agent.id, moduleId);
      }

      // Poll for completed builders
      await this.sleep(POLL_INTERVAL_MS);

      for (const [agentId, moduleId] of activeBuilders) {
        const status = await this.runtime.status(agentId);
        if (status === "stopped") {
          completedModules.add(moduleId);
          activeBuilders.delete(agentId);
          updateAgentStatus(this.db, agentId, "completed");
          createEvent(this.db, runId, "agent-completed", { moduleId }, agentId);
          log.info(`Builder completed: ${moduleId}`);
        }
      }

      // Check for stale agents
      const stale = getStaleAgents(this.db, this.config.runtime.heartbeat_timeout_ms);
      for (const agent of stale) {
        if (activeBuilders.has(agent.id)) {
          log.warn(`Stale builder detected: ${agent.name}`);
          await this.runtime.kill(agent.id);
          updateAgentStatus(this.db, agent.id, "killed", "heartbeat timeout");
          const modId = activeBuilders.get(agent.id)!;
          activeBuilders.delete(agent.id);
          createEvent(this.db, runId, "agent-killed", { moduleId: modId, reason: "heartbeat timeout" }, agent.id);
        }
      }

      // Budget check
      const budgetStatus = checkBudget(this.db, runId);
      if (budgetStatus.overBudget) {
        throw new Error(`Budget exceeded: $${budgetStatus.spentUsd.toFixed(2)} / $${budgetStatus.budgetUsd.toFixed(2)}`);
      }
    }

    log.info(`All ${plan.modules.length} modules built`);
  }

  /**
   * Wait for a single agent to complete (poll-based).
   */
  private async waitForAgent(agentId: string): Promise<void> {
    while (true) {
      await this.sleep(POLL_INTERVAL_MS);

      const status = await this.runtime.status(agentId);
      if (status === "stopped" || status === "unknown") {
        return;
      }
    }
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
