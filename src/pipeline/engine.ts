import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import type { SqliteDb } from "../db/index.js";
import type { DfConfig, Buildplan } from "../types/index.js";
import type { AgentRuntime } from "../runtime/interface.js";
import { createRun, getRun, updateRunStatus, updateRunPhase, incrementRunIteration } from "../db/queries/runs.js";
import { getSpec } from "../db/queries/specs.js";
import { createAgent, getAgent, updateAgentPid, updateAgentStatus, getActiveAgents, getStaleAgents } from "../db/queries/agents.js";
import { getActiveBuildplan } from "../db/queries/buildplans.js";
import { createEvent } from "../db/queries/events.js";
import { createMessage } from "../db/queries/messages.js";
import { listContracts, createBinding, createDependency, satisfyDependency } from "../db/queries/contracts.js";
import { getNextPhase, shouldSkipPhase, PHASE_ORDER } from "./phases.js";
import type { PhaseName } from "./phases.js";
import { getReadyModules } from "./scheduler.js";
import { getResumePoint, getCompletedModules } from "./resume.js";
import type { ResumeOptions } from "./resume.js";
import { checkBudget } from "./budget.js";
import { log } from "../utils/logger.js";
import { getOrchestratorPrompt } from "../agents/prompts/orchestrator.js";
import { getArchitectPrompt } from "../agents/prompts/architect.js";
import { getBuilderPrompt } from "../agents/prompts/builder.js";
import { getEvaluatorPrompt } from "../agents/prompts/evaluator.js";
import { getMergerPrompt } from "../agents/prompts/merger.js";
import { createWorktree, removeWorktree } from "../runtime/worktree.js";
import { findDfDir } from "../utils/config.js";

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
    console.log(`[dark] Pipeline orchestrating agents for spec ${specId}. Do NOT write code yourself — agents handle implementation.`);

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

      // Count results
      const agents = getActiveAgents(this.db, run.id);
      const completedCount = this.db.prepare(
        "SELECT COUNT(*) as cnt FROM agents WHERE run_id = ? AND status = 'completed'"
      ).get(run.id) as { cnt: number };

      updateRunStatus(this.db, run.id, "completed");
      createEvent(this.db, run.id, "run-completed");
      log.success(`Pipeline completed: ${run.id}`);
      console.log(`[dark] Pipeline complete. ${completedCount.cnt} agents finished. Review with: git diff`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      updateRunStatus(this.db, run.id, "failed", error);
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
      mode: run.mode,
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
          await this.executeResumeBuildPhase(runId, previouslyCompletedModules);
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
   * Build phase that pre-populates completedModules from previous attempts.
   * Only builds modules that haven't already been completed.
   */
  private async executeResumeBuildPhase(runId: string, previouslyCompletedModules: Set<string>): Promise<void> {
    const run = getRun(this.db, runId)!;
    const bp = getActiveBuildplan(this.db, run.spec_id);

    if (!bp) {
      // No buildplan — fall through to normal single-builder
      log.info("No buildplan found, spawning single builder (resume)");
      const agent = createAgent(this.db, {
        agent_id: "",
        run_id: runId,
        role: "builder",
        name: `builder-main-${Date.now()}`,
        system_prompt: "pending",
      });

      const prompt = getBuilderPrompt({
        specId: run.spec_id, runId, agentId: agent.id,
        moduleId: "main", contracts: [], worktreePath: ".",
      });
      this.db.prepare("UPDATE agents SET system_prompt = ? WHERE id = ?").run(prompt, agent.id);

      this.sendInstructions(runId, agent.id, "builder", { moduleId: "main", worktreePath: "." });
      createEvent(this.db, runId, "builder-started", { moduleId: "main" }, agent.id);

      const handle = await this.runtime.spawn({
        agent_id: agent.id,
        run_id: runId,
        role: "builder",
        name: agent.name,
        system_prompt: prompt,
      });

      updateAgentPid(this.db, agent.id, handle.pid);
      await this.waitForAgent(agent.id, handle.pid);
      return;
    }

    const plan: Buildplan = JSON.parse(bp.plan);
    // Start with previously completed modules pre-populated
    const completedModules = new Set<string>(previouslyCompletedModules);
    const activeBuilders = new Map<string, { moduleId: string; worktreePath: string | null }>();

    log.info(`Resuming build: ${completedModules.size} modules already completed, ${plan.modules.length - completedModules.size} remaining`);

    // Resolve project root for worktree creation
    const dfDir = findDfDir();
    const projectRoot = dfDir ? dirname(dfDir) : process.cwd();

    while (completedModules.size < plan.modules.length) {
      // Find modules ready to build (excluding already-completed and active)
      const ready = getReadyModules(plan.modules, plan.dependencies, completedModules)
        .filter((id) => ![...activeBuilders.values()].map(v => v.moduleId).includes(id));

      // Spawn builders up to max_parallel
      const activeCount = (await this.runtime.listActive()).length;
      const slotsAvailable = this.config.build.max_parallel - activeCount;

      for (const moduleId of ready.slice(0, slotsAvailable)) {
        const mod = plan.modules.find((m) => m.id === moduleId)!;

        // Create worktree
        const runShort = runId.slice(0, 8);
        const suffix = Date.now().toString(36);
        const branchName = `df-build/${runShort}/${moduleId}-${suffix}`;
        const worktreeDir = join(tmpdir(), "df-worktrees", `${moduleId}-${suffix}`);
        let worktreePath: string | null = null;

        try {
          const wt = createWorktree(projectRoot, branchName, worktreeDir);
          worktreePath = wt.path;
          log.info(`Worktree created for ${moduleId}: ${worktreePath}`);
        } catch (err) {
          log.warn(`Failed to create worktree for ${moduleId}, using project root: ${err}`);
          worktreePath = projectRoot;
        }

        const moduleContracts = listContracts(this.db, runId, bp.id)
          .filter((c) => {
            const contractDef = plan.contracts.find((cd) => cd.name === c.name);
            return contractDef?.bound_modules.includes(moduleId);
          });
        const contractNames = moduleContracts.map((c) => c.name);

        const agent = createAgent(this.db, {
          agent_id: "",
          run_id: runId,
          role: "builder",
          name: `builder-${moduleId}`,
          module_id: moduleId,
          buildplan_id: bp.id,
          worktree_path: worktreePath,
          system_prompt: getBuilderPrompt({
            specId: run.spec_id, runId, agentId: "",
            moduleId, contracts: contractNames, worktreePath: worktreePath ?? ".",
          }),
        });

        const prompt = getBuilderPrompt({
          specId: run.spec_id, runId, agentId: agent.id,
          moduleId, contracts: contractNames, worktreePath: worktreePath ?? ".",
        });
        this.db.prepare("UPDATE agents SET system_prompt = ? WHERE id = ?").run(prompt, agent.id);

        for (const contract of moduleContracts) {
          const contractDef = plan.contracts.find((cd) => cd.name === contract.name);
          const bindingRole = contractDef?.binding_roles[moduleId] ?? "consumer";
          createBinding(this.db, contract.id, agent.id, moduleId, bindingRole);
        }

        const moduleDeps = plan.dependencies.filter((d) => d.from === moduleId);
        for (const dep of moduleDeps) {
          createDependency(this.db, runId, agent.id, dep.to, dep.type);
        }

        this.sendInstructions(runId, agent.id, "builder", {
          moduleId,
          worktreePath: worktreePath ?? ".",
          contracts: contractNames,
          scope: mod.scope,
        });

        createEvent(this.db, runId, "builder-started", { moduleId }, agent.id);
        console.log(`[dark] Build phase (resume): spawning builder for module "${moduleId}"`);

        const handle = await this.runtime.spawn({
          agent_id: agent.id,
          run_id: runId,
          role: "builder",
          name: agent.name,
          module_id: moduleId,
          buildplan_id: bp.id,
          worktree_path: worktreePath ?? undefined,
          system_prompt: prompt,
        });

        updateAgentPid(this.db, agent.id, handle.pid);
        activeBuilders.set(agent.id, { moduleId, worktreePath });
        console.log(`[dark] Builder "${moduleId}" spawned (PID ${handle.pid})`);
      }

      // Poll for completed/failed builders
      await this.sleep(POLL_INTERVAL_MS);

      for (const [agentId, info] of activeBuilders) {
        const agentRecord = getAgent(this.db, agentId);
        if (!agentRecord) continue;

        if (agentRecord.status === "completed") {
          completedModules.add(info.moduleId);
          activeBuilders.delete(agentId);
          createEvent(this.db, runId, "agent-completed", { moduleId: info.moduleId }, agentId);
          log.info(`Builder completed: ${info.moduleId}`);

          const deps = this.db.prepare(
            "SELECT id FROM builder_dependencies WHERE run_id = ? AND depends_on_module_id = ? AND satisfied = 0"
          ).all(runId, info.moduleId) as { id: string }[];
          for (const dep of deps) {
            satisfyDependency(this.db, dep.id);
          }
          continue;
        }

        if (agentRecord.status === "failed") {
          activeBuilders.delete(agentId);
          createEvent(this.db, runId, "agent-failed", {
            moduleId: info.moduleId,
            error: agentRecord.error,
          }, agentId);
          log.error(`Builder failed for ${info.moduleId}: ${agentRecord.error}`);

          if (info.worktreePath && info.worktreePath !== projectRoot) {
            try { removeWorktree(info.worktreePath); } catch { /* ignore */ }
          }

          throw new Error(`Builder failed for module "${info.moduleId}": ${agentRecord.error ?? "unknown error"}`);
        }

        const runtimeStatus = await this.runtime.status(agentId);
        if (runtimeStatus === "stopped" || runtimeStatus === "unknown") {
          updateAgentStatus(this.db, agentId, "failed", "Process exited without completing");
          activeBuilders.delete(agentId);
          createEvent(this.db, runId, "agent-failed", {
            moduleId: info.moduleId,
            error: "Process exited without completing",
          }, agentId);

          if (info.worktreePath && info.worktreePath !== projectRoot) {
            try { removeWorktree(info.worktreePath); } catch { /* ignore */ }
          }

          throw new Error(`Builder crashed for module "${info.moduleId}": process exited without completing`);
        }
      }

      // Budget check
      const budgetStatus = checkBudget(this.db, runId);
      if (budgetStatus.overBudget) {
        throw new Error(`Budget exceeded: $${budgetStatus.spentUsd.toFixed(2)} / $${budgetStatus.budgetUsd.toFixed(2)}`);
      }
    }

    log.info(`All ${plan.modules.length} modules built (${previouslyCompletedModules.size} from previous run)`);
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
        // Resolve the spec file path for the architect
        const spec = getSpec(this.db, run.spec_id);
        const specFilePath = spec?.file_path ?? "";

        await this.executeAgentPhase(runId, "architect", (agentId) =>
          getArchitectPrompt({ specId: run.spec_id, runId, agentId, specFilePath }),
        );
        break;
      }

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

      case "merge": {
        // Collect worktree paths from completed builders
        const completedBuilders = this.db.prepare(
          "SELECT worktree_path FROM agents WHERE run_id = ? AND role = 'builder' AND status = 'completed' AND worktree_path IS NOT NULL"
        ).all(runId) as { worktree_path: string }[];
        const worktreePaths = completedBuilders.map((b) => b.worktree_path);

        await this.executeAgentPhase(runId, "merger", (agentId) =>
          getMergerPrompt({ runId, agentId, targetBranch: this.config.project.branch, worktreePaths }),
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

  /**
   * Send actionable instructions to an agent via the mail system.
   */
  private sendInstructions(
    runId: string,
    agentId: string,
    role: string,
    context: Record<string, unknown>,
  ): void {
    let body: string;

    switch (role) {
      case "architect": {
        const specFilePath = context.specFilePath as string | undefined;
        let specContent = "";
        if (specFilePath) {
          try {
            specContent = readFileSync(specFilePath, "utf-8");
          } catch {
            specContent = `(Could not read spec file: ${specFilePath})`;
          }
        }

        body = [
          "# Architect Instructions",
          "",
          "## Your Task",
          "Analyze the specification below, decompose it into buildable modules, and create holdout test scenarios.",
          "",
          "## Spec Content",
          "```",
          specContent || "(No spec content available — check the spec file manually)",
          "```",
          "",
          "## Steps",
          `1. Read and analyze the spec above`,
          `2. Decompose into modules with clear boundaries and interface contracts`,
          `3. Create holdout test scenarios from the spec's Scenarios section:`,
          `   dark scenario create ${agentId} --name "<name>" --type functional --content "<detailed test steps>"`,
          `   dark scenario create ${agentId} --name "<name>" --type change --content "<modification description>"`,
          `4. Submit your buildplan: dark architect submit-plan ${agentId} --plan '<json>'`,
          `5. Mark yourself complete: dark agent complete ${agentId}`,
          "",
          "IMPORTANT: You MUST create at least one scenario AND submit a buildplan before completing.",
          "Scenarios are holdout tests that builders never see — the evaluator uses them to validate the build.",
          "",
          "If you cannot complete this work, call:",
          `dark agent fail ${agentId} --error "<description>"`,
        ].join("\n");
        break;
      }

      case "builder": {
        const moduleId = context.moduleId as string;
        const worktreePath = context.worktreePath as string;
        const contracts = context.contracts as string[] | undefined;
        const scope = context.scope as { creates?: string[]; modifies?: string[]; test_files?: string[] } | undefined;

        body = [
          "# Builder Instructions",
          "",
          `## Module: ${moduleId}`,
          `## Worktree: ${worktreePath}`,
          scope ? `## Scope:` : "",
          scope?.creates?.length ? `- Creates: ${scope.creates.join(", ")}` : "",
          scope?.modifies?.length ? `- Modifies: ${scope.modifies.join(", ")}` : "",
          scope?.test_files?.length ? `- Tests: ${scope.test_files.join(", ")}` : "",
          contracts?.length ? `## Contracts: ${contracts.join(", ")}` : "",
          "",
          "## Steps",
          "1. Read this assignment and understand your module scope",
          "2. Follow TDD: write a failing test, make it pass, refactor",
          "3. Implement all functionality defined in your module scope",
          "4. Commit your work in the worktree",
          `5. Mark yourself complete: dark agent complete ${agentId}`,
          "",
          "If you cannot complete this work, call:",
          `dark agent fail ${agentId} --error "<description>"`,
        ].join("\n");
        break;
      }

      case "evaluator": {
        body = [
          "# Evaluator Instructions",
          "",
          "## Holdout Scenarios",
          "List available scenarios: dark scenario list --json",
          "Scenarios are in .df/scenarios/functional/ and .df/scenarios/change/",
          "Read each scenario file to get test steps, inputs, and expected outputs.",
          "",
          "## Steps",
          "1. List scenarios: dark scenario list",
          "2. Read each scenario file from .df/scenarios/",
          "3. Execute each scenario against the integrated code",
          "4. Score each scenario: pass (1.0) or fail (0.0)",
          `5. Report your results: dark agent report-result ${agentId} --passed <true|false> --score <0.0-1.0>`,
          `6. Mark yourself complete: dark agent complete ${agentId}`,
          "",
          "IMPORTANT: You MUST call report-result before complete. Complete will reject without results.",
          "",
          "If you cannot complete this work, call:",
          `dark agent fail ${agentId} --error "<description>"`,
        ].join("\n");
        break;
      }

      case "merger": {
        const worktreePaths = context.worktreePaths as string[] | undefined;
        body = [
          "# Merger Instructions",
          "",
          worktreePaths?.length ? `## Worktrees to merge: ${worktreePaths.join(", ")}` : "## No worktrees specified",
          "",
          "## Steps",
          "1. Merge each worktree branch into the target branch in dependency order",
          "2. Resolve any simple conflicts automatically",
          "3. Run all tests post-merge",
          "4. Commit the merged result to the target branch",
          `5. Mark yourself complete: dark agent complete ${agentId}`,
          "",
          "IMPORTANT: You MUST create at least one commit on the target branch before complete. Complete will reject without new commits.",
          "",
          "If you cannot complete this work, call:",
          `dark agent fail ${agentId} --error "<description>"`,
        ].join("\n");
        break;
      }

      case "integration-tester": {
        body = [
          "# Integration Tester Instructions",
          "",
          "## Steps",
          "1. Run integration tests across all merged modules",
          "2. Verify cross-module contracts are satisfied",
          `3. Report your results: dark agent report-result ${agentId} --passed <true|false> --score <0.0-1.0>`,
          `4. Mark yourself complete: dark agent complete ${agentId}`,
          "",
          "IMPORTANT: You MUST call report-result before complete. Complete will reject without results.",
          "",
          "If you cannot complete this work, call:",
          `dark agent fail ${agentId} --error "<description>"`,
        ].join("\n");
        break;
      }

      default:
        body = `Complete your ${role} task, then call: dark agent complete ${agentId}`;
    }

    createMessage(this.db, runId, "orchestrator", body, { toAgentId: agentId });
  }

  /**
   * Spawn a single agent for a phase and wait for it to complete.
   */
  private async executeAgentPhase(
    runId: string,
    role: "architect" | "evaluator" | "merger" | "integration-tester",
    getPrompt: (agentId: string) => string,
    instructionContext?: Record<string, unknown>,
  ): Promise<void> {
    const agent = createAgent(this.db, {
      agent_id: "", // Will be overwritten — createAgent generates its own ID
      run_id: runId,
      role,
      name: `${role}-${Date.now()}`,
      system_prompt: "pending",
    });

    const prompt = getPrompt(agent.id);
    // Update system prompt after we have the agent ID
    this.db.prepare("UPDATE agents SET system_prompt = ? WHERE id = ?").run(prompt, agent.id);

    // Send actionable instructions via mail before spawning
    this.sendInstructions(runId, agent.id, role, instructionContext ?? {});

    createEvent(this.db, runId, "agent-spawned", { role }, agent.id);
    console.log(`[dark] Phase ${role}: spawning agent...`);

    const handle = await this.runtime.spawn({
      agent_id: agent.id,
      run_id: runId,
      role,
      name: agent.name,
      system_prompt: prompt,
    });

    updateAgentPid(this.db, agent.id, handle.pid);
    console.log(`[dark] Phase ${role}: agent spawned (PID ${handle.pid})... waiting for completion`);

    // Poll until agent completes (DB-based)
    await this.waitForAgent(agent.id, handle.pid);

    const finalAgent = getAgent(this.db, agent.id);
    if (finalAgent) {
      console.log(`[dark] Agent ${finalAgent.name} completed.`);
    }
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
      const agent = createAgent(this.db, {
        agent_id: "",
        run_id: runId,
        role: "builder",
        name: `builder-main-${Date.now()}`,
        system_prompt: "pending",
      });

      const prompt = getBuilderPrompt({
        specId: run.spec_id, runId, agentId: agent.id,
        moduleId: "main", contracts: [], worktreePath: ".",
      });
      this.db.prepare("UPDATE agents SET system_prompt = ? WHERE id = ?").run(prompt, agent.id);

      this.sendInstructions(runId, agent.id, "builder", { moduleId: "main", worktreePath: "." });

      createEvent(this.db, runId, "builder-started", { moduleId: "main" }, agent.id);

      const handle = await this.runtime.spawn({
        agent_id: agent.id,
        run_id: runId,
        role: "builder",
        name: agent.name,
        system_prompt: prompt,
      });

      updateAgentPid(this.db, agent.id, handle.pid);
      await this.waitForAgent(agent.id, handle.pid);
      return;
    }

    const plan: Buildplan = JSON.parse(bp.plan);
    const completedModules = new Set<string>();
    const activeBuilders = new Map<string, { moduleId: string; worktreePath: string | null }>(); // agentId -> info

    // Resolve project root for worktree creation
    const dfDir = findDfDir();
    const projectRoot = dfDir ? dirname(dfDir) : process.cwd();

    while (completedModules.size < plan.modules.length) {
      // Find modules ready to build
      const ready = getReadyModules(plan.modules, plan.dependencies, completedModules)
        .filter((id) => ![...activeBuilders.values()].map(v => v.moduleId).includes(id));

      // Spawn builders up to max_parallel
      const activeCount = (await this.runtime.listActive()).length;
      const slotsAvailable = this.config.build.max_parallel - activeCount;

      for (const moduleId of ready.slice(0, slotsAvailable)) {
        const mod = plan.modules.find((m) => m.id === moduleId)!;

        // Create worktree for this builder in /tmp/ to isolate from .df/scenarios/
        const runShort = runId.slice(0, 8);
        const suffix = Date.now().toString(36);
        const branchName = `df-build/${runShort}/${moduleId}-${suffix}`;
        const worktreeDir = join(tmpdir(), "df-worktrees", `${moduleId}-${suffix}`);
        let worktreePath: string | null = null;

        try {
          const wt = createWorktree(projectRoot, branchName, worktreeDir);
          worktreePath = wt.path;
          log.info(`Worktree created for ${moduleId}: ${worktreePath}`);
        } catch (err) {
          log.warn(`Failed to create worktree for ${moduleId}, using project root: ${err}`);
          worktreePath = projectRoot;
        }

        // Get contracts for this module
        const moduleContracts = listContracts(this.db, runId, bp.id)
          .filter((c) => {
            // Find contracts that mention this module in the buildplan
            const contractDef = plan.contracts.find((cd) => cd.name === c.name);
            return contractDef?.bound_modules.includes(moduleId);
          });
        const contractNames = moduleContracts.map((c) => c.name);

        const agent = createAgent(this.db, {
          agent_id: "",
          run_id: runId,
          role: "builder",
          name: `builder-${moduleId}`,
          module_id: moduleId,
          buildplan_id: bp.id,
          worktree_path: worktreePath,
          system_prompt: getBuilderPrompt({
            specId: run.spec_id, runId, agentId: "",
            moduleId, contracts: contractNames, worktreePath: worktreePath ?? ".",
          }),
        });

        // Update prompt with actual agent ID
        const prompt = getBuilderPrompt({
          specId: run.spec_id, runId, agentId: agent.id,
          moduleId, contracts: contractNames, worktreePath: worktreePath ?? ".",
        });
        this.db.prepare("UPDATE agents SET system_prompt = ? WHERE id = ?").run(prompt, agent.id);

        // Create contract bindings
        for (const contract of moduleContracts) {
          const contractDef = plan.contracts.find((cd) => cd.name === contract.name);
          const bindingRole = contractDef?.binding_roles[moduleId] ?? "consumer";
          createBinding(this.db, contract.id, agent.id, moduleId, bindingRole);
        }

        // Create builder dependencies from DAG
        const moduleDeps = plan.dependencies.filter((d) => d.from === moduleId);
        for (const dep of moduleDeps) {
          createDependency(this.db, runId, agent.id, dep.to, dep.type);
        }

        // Send instructions via mail
        this.sendInstructions(runId, agent.id, "builder", {
          moduleId,
          worktreePath: worktreePath ?? ".",
          contracts: contractNames,
          scope: mod.scope,
        });

        createEvent(this.db, runId, "builder-started", { moduleId }, agent.id);
        console.log(`[dark] Build phase: spawning builder for module "${moduleId}" (PID pending...)`);

        const handle = await this.runtime.spawn({
          agent_id: agent.id,
          run_id: runId,
          role: "builder",
          name: agent.name,
          module_id: moduleId,
          buildplan_id: bp.id,
          worktree_path: worktreePath ?? undefined,
          system_prompt: prompt,
        });

        updateAgentPid(this.db, agent.id, handle.pid);
        activeBuilders.set(agent.id, { moduleId, worktreePath });
        console.log(`[dark] Builder "${moduleId}" spawned (PID ${handle.pid})`);
      }

      // Poll for completed/failed builders
      await this.sleep(POLL_INTERVAL_MS);

      for (const [agentId, info] of activeBuilders) {
        const agentRecord = getAgent(this.db, agentId);
        if (!agentRecord) continue;

        // Check DB status first (agent may have called `dark agent complete` or `dark agent fail`)
        if (agentRecord.status === "completed") {
          completedModules.add(info.moduleId);
          activeBuilders.delete(agentId);
          createEvent(this.db, runId, "agent-completed", { moduleId: info.moduleId }, agentId);
          log.info(`Builder completed: ${info.moduleId}`);

          // Satisfy dependencies that depend on this module
          const deps = this.db.prepare(
            "SELECT id FROM builder_dependencies WHERE run_id = ? AND depends_on_module_id = ? AND satisfied = 0"
          ).all(runId, info.moduleId) as { id: string }[];
          for (const dep of deps) {
            satisfyDependency(this.db, dep.id);
          }
          continue;
        }

        if (agentRecord.status === "failed") {
          activeBuilders.delete(agentId);
          createEvent(this.db, runId, "agent-failed", {
            moduleId: info.moduleId,
            error: agentRecord.error,
          }, agentId);
          log.error(`Builder failed for ${info.moduleId}: ${agentRecord.error}`);

          // Clean up worktree
          if (info.worktreePath && info.worktreePath !== projectRoot) {
            try { removeWorktree(info.worktreePath); } catch { /* ignore */ }
          }

          throw new Error(`Builder failed for module "${info.moduleId}": ${agentRecord.error ?? "unknown error"}`);
        }

        // DB status is still running — check if PID is alive
        const runtimeStatus = await this.runtime.status(agentId);
        if (runtimeStatus === "stopped" || runtimeStatus === "unknown") {
          // PID is dead but DB status is still running → crashed
          updateAgentStatus(this.db, agentId, "failed", "Process exited without completing");
          activeBuilders.delete(agentId);
          createEvent(this.db, runId, "agent-failed", {
            moduleId: info.moduleId,
            error: "Process exited without completing",
          }, agentId);
          log.error(`Builder crashed for ${info.moduleId}: process exited without completing`);

          // Clean up worktree
          if (info.worktreePath && info.worktreePath !== projectRoot) {
            try { removeWorktree(info.worktreePath); } catch { /* ignore */ }
          }

          throw new Error(`Builder crashed for module "${info.moduleId}": process exited without completing`);
        }
      }

      // Log stale agents as warnings but don't kill them.
      // In --print mode, agents can't send heartbeats mid-turn.
      // Actual failures are caught by DB status + PID liveness checks above.
      const stale = getStaleAgents(this.db, this.config.runtime.heartbeat_timeout_ms);
      for (const agent of stale) {
        if (activeBuilders.has(agent.id)) {
          log.warn(`Builder ${agent.name} has not sent a heartbeat recently (may be mid-turn)`);
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
   * Wait for a single agent to complete (DB-based with PID fallback).
   */
  private async waitForAgent(agentId: string, pid?: number): Promise<void> {
    while (true) {
      await this.sleep(POLL_INTERVAL_MS);

      // Check DB status first
      const agentRecord = getAgent(this.db, agentId);
      if (agentRecord) {
        if (agentRecord.status === "completed") {
          return;
        }
        if (agentRecord.status === "failed") {
          throw new Error(`Agent failed: ${agentRecord.error ?? "unknown error"}`);
        }
      }

      // Fallback: check PID liveness
      const runtimeStatus = await this.runtime.status(agentId);
      if (runtimeStatus === "stopped" || runtimeStatus === "unknown") {
        // PID is dead — check DB one more time
        const finalCheck = getAgent(this.db, agentId);
        if (finalCheck?.status === "completed") return;
        if (finalCheck?.status === "failed") {
          throw new Error(`Agent failed: ${finalCheck.error ?? "unknown error"}`);
        }

        // Process exited without updating DB — mark as failed
        updateAgentStatus(this.db, agentId, "failed", "Process exited without completing");
        throw new Error("Agent process exited without completing");
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
