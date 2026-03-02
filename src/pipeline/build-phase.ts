/**
 * Build phase execution — extracted from engine.ts.
 *
 * Handles spawning builder agents per buildplan module, respecting the
 * dependency DAG, polling for completion, and budget checking.
 *
 * Exports:
 *   executeBuildPhase(db, runtime, config, runId)
 *   executeResumeBuildPhase(db, runtime, config, runId, completedModules)
 */

import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import type { SqliteDb } from "../db/index.js";
import type { DfConfig, Buildplan } from "../types/index.js";
import type { AgentRuntime } from "../runtime/interface.js";
import { getRun } from "../db/queries/runs.js";
import { createAgent, getAgent, updateAgentStatus, getStaleAgents } from "../db/queries/agents.js";
import { getActiveBuildplan } from "../db/queries/buildplans.js";
import { createEvent } from "../db/queries/events.js";
import { createMessage } from "../db/queries/messages.js";
import { listContracts, createBinding, createDependency, satisfyDependency } from "../db/queries/contracts.js";
import { updateAgentPid } from "../db/queries/agents.js";
import { getReadyModules } from "./scheduler.js";
import { checkBudget, recordCost } from "./budget.js";
import { log } from "../utils/logger.js";
import { getBuilderPrompt } from "../agents/prompts/builder.js";
import { createWorktree, removeWorktree } from "../runtime/worktree.js";
import { findDfDir } from "../utils/config.js";

/** Default poll interval (5s). Can be overridden via options for testing. */
const DEFAULT_POLL_INTERVAL_MS = 5_000;

/** Options for build phase execution. */
export interface BuildPhaseOptions {
  /** Override poll interval (ms). Useful for testing. */
  pollIntervalMs?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a single agent to complete (DB-based with PID fallback).
 */
async function waitForAgent(
  db: SqliteDb,
  runtime: AgentRuntime,
  agentId: string,
  _pid?: number,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
): Promise<void> {
  while (true) {
    await sleep(pollIntervalMs);

    const agentRecord = getAgent(db, agentId);
    if (agentRecord) {
      if (agentRecord.status === "completed") return;
      if (agentRecord.status === "failed") {
        throw new Error(`Agent failed: ${agentRecord.error ?? "unknown error"}`);
      }
    }

    const runtimeStatus = await runtime.status(agentId);
    if (runtimeStatus === "stopped" || runtimeStatus === "unknown") {
      const finalCheck = getAgent(db, agentId);
      if (finalCheck?.status === "completed") return;
      if (finalCheck?.status === "failed") {
        throw new Error(`Agent failed: ${finalCheck.error ?? "unknown error"}`);
      }
      updateAgentStatus(db, agentId, "failed", "Process exited without completing");
      throw new Error("Agent process exited without completing");
    }
  }
}

/**
 * If an agent completed without self-reporting cost, estimate from elapsed time.
 * Rough heuristic: ~$0.05/min for Sonnet agents.
 */
function estimateCostIfMissing(
  db: SqliteDb,
  agent: { id: string; run_id: string; cost_usd: number; created_at: string; updated_at: string },
): void {
  if (agent.cost_usd > 0) return;

  const elapsedMs = new Date(agent.updated_at).getTime() - new Date(agent.created_at).getTime();
  const elapsedMin = elapsedMs / 60_000;
  const estimatedCost = Math.max(0.01, elapsedMin * 0.05);
  const estimatedTokens = Math.round(elapsedMin * 4000);

  recordCost(db, agent.run_id, agent.id, estimatedCost, estimatedTokens);
}

/**
 * Send builder-specific instructions via the mail system.
 */
function sendBuilderInstructions(
  db: SqliteDb,
  runId: string,
  agentId: string,
  context: Record<string, unknown>,
): void {
  const moduleId = context.moduleId as string;
  const worktreePath = context.worktreePath as string;
  const contracts = context.contracts as string[] | undefined;
  const scope = context.scope as { creates?: string[]; modifies?: string[]; test_files?: string[] } | undefined;

  const body = [
    "# Builder Instructions",
    "",
    `## Module: ${moduleId}`,
    `## Worktree: ${worktreePath}`,
    scope ? "## Scope:" : "",
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

  createMessage(db, runId, "orchestrator", body, { toAgentId: agentId });
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Build phase: spawn builders per buildplan, respecting dependency DAG.
 */
export async function executeBuildPhase(
  db: SqliteDb,
  runtime: AgentRuntime,
  config: DfConfig,
  runId: string,
  options?: BuildPhaseOptions,
): Promise<void> {
  const pollMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const run = getRun(db, runId)!;
  const bp = getActiveBuildplan(db, run.spec_id);

  if (!bp) {
    // No buildplan — spawn a single builder
    log.info("No buildplan found, spawning single builder");
    const agent = createAgent(db, {
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
    db.prepare("UPDATE agents SET system_prompt = ? WHERE id = ?").run(prompt, agent.id);

    sendBuilderInstructions(db, runId, agent.id, { moduleId: "main", worktreePath: "." });

    createEvent(db, runId, "builder-started", { moduleId: "main" }, agent.id);

    const handle = await runtime.spawn({
      agent_id: agent.id,
      run_id: runId,
      role: "builder",
      name: agent.name,
      system_prompt: prompt,
    });

    updateAgentPid(db, agent.id, handle.pid);
    await waitForAgent(db, runtime, agent.id, handle.pid, pollMs);
    return;
  }

  const plan: Buildplan = JSON.parse(bp.plan);
  const completedModules = new Set<string>();
  const activeBuilders = new Map<string, { moduleId: string; worktreePath: string | null }>();

  // Resolve project root for worktree creation
  const dfDir = findDfDir();
  const projectRoot = dfDir ? dirname(dfDir) : process.cwd();

  while (completedModules.size < plan.modules.length) {
    // Find modules ready to build
    const ready = getReadyModules(plan.modules, plan.dependencies, completedModules)
      .filter((id) => ![...activeBuilders.values()].map(v => v.moduleId).includes(id));

    // Spawn builders up to max_parallel
    const activeCount = (await runtime.listActive()).length;
    const slotsAvailable = config.build.max_parallel - activeCount;

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
      const moduleContracts = listContracts(db, runId, bp.id)
        .filter((c) => {
          const contractDef = plan.contracts.find((cd) => cd.name === c.name);
          return contractDef?.bound_modules.includes(moduleId);
        });
      const contractNames = moduleContracts.map((c) => c.name);

      const agent = createAgent(db, {
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
      db.prepare("UPDATE agents SET system_prompt = ? WHERE id = ?").run(prompt, agent.id);

      // Create contract bindings
      for (const contract of moduleContracts) {
        const contractDef = plan.contracts.find((cd) => cd.name === contract.name);
        const bindingRole = contractDef?.binding_roles[moduleId] ?? "consumer";
        createBinding(db, contract.id, agent.id, moduleId, bindingRole);
      }

      // Create builder dependencies from DAG
      const moduleDeps = plan.dependencies.filter((d) => d.from === moduleId);
      for (const dep of moduleDeps) {
        createDependency(db, runId, agent.id, dep.to, dep.type);
      }

      // Send instructions via mail
      sendBuilderInstructions(db, runId, agent.id, {
        moduleId,
        worktreePath: worktreePath ?? ".",
        contracts: contractNames,
        scope: mod.scope,
      });

      createEvent(db, runId, "builder-started", { moduleId }, agent.id);
      console.log(`[dark] Build phase: spawning builder for module "${moduleId}" (PID pending...)`);

      const handle = await runtime.spawn({
        agent_id: agent.id,
        run_id: runId,
        role: "builder",
        name: agent.name,
        module_id: moduleId,
        buildplan_id: bp.id,
        worktree_path: worktreePath ?? undefined,
        system_prompt: prompt,
      });

      updateAgentPid(db, agent.id, handle.pid);
      activeBuilders.set(agent.id, { moduleId, worktreePath });
      console.log(`[dark] Builder "${moduleId}" spawned (PID ${handle.pid})`);
    }

    // Poll for completed/failed builders
    await sleep(pollMs);

    for (const [agentId, info] of activeBuilders) {
      const agentRecord = getAgent(db, agentId);
      if (!agentRecord) continue;

      if (agentRecord.status === "completed") {
        completedModules.add(info.moduleId);
        activeBuilders.delete(agentId);
        createEvent(db, runId, "agent-completed", { moduleId: info.moduleId }, agentId);
        estimateCostIfMissing(db, agentRecord);
        log.info(`Builder completed: ${info.moduleId} ($${agentRecord.cost_usd.toFixed(2)})`);

        // Satisfy dependencies that depend on this module
        const deps = db.prepare(
          "SELECT id FROM builder_dependencies WHERE run_id = ? AND depends_on_module_id = ? AND satisfied = 0"
        ).all(runId, info.moduleId) as { id: string }[];
        for (const dep of deps) {
          satisfyDependency(db, dep.id);
        }
        continue;
      }

      if (agentRecord.status === "failed") {
        activeBuilders.delete(agentId);
        createEvent(db, runId, "agent-failed", {
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
      const runtimeStatus = await runtime.status(agentId);
      if (runtimeStatus === "stopped" || runtimeStatus === "unknown") {
        updateAgentStatus(db, agentId, "failed", "Process exited without completing");
        activeBuilders.delete(agentId);
        createEvent(db, runId, "agent-failed", {
          moduleId: info.moduleId,
          error: "Process exited without completing",
        }, agentId);
        log.error(`Builder crashed for ${info.moduleId}: process exited without completing`);

        if (info.worktreePath && info.worktreePath !== projectRoot) {
          try { removeWorktree(info.worktreePath); } catch { /* ignore */ }
        }

        throw new Error(`Builder crashed for module "${info.moduleId}": process exited without completing`);
      }
    }

    // Log stale agents as warnings but don't kill them
    const stale = getStaleAgents(db, config.runtime.heartbeat_timeout_ms);
    for (const agent of stale) {
      if (activeBuilders.has(agent.id)) {
        log.warn(`Builder ${agent.name} has not sent a heartbeat recently (may be mid-turn)`);
      }
    }

    // Budget check
    const budgetStatus = checkBudget(db, runId);
    if (budgetStatus.overBudget) {
      throw new Error(`Budget exceeded: $${budgetStatus.spentUsd.toFixed(2)} / $${budgetStatus.budgetUsd.toFixed(2)}`);
    }
  }

  log.info(`All ${plan.modules.length} modules built`);
}

/**
 * Build phase that pre-populates completedModules from previous attempts.
 * Only builds modules that haven't already been completed.
 */
export async function executeResumeBuildPhase(
  db: SqliteDb,
  runtime: AgentRuntime,
  config: DfConfig,
  runId: string,
  previouslyCompletedModules: Set<string>,
  options?: BuildPhaseOptions,
): Promise<void> {
  const pollMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const run = getRun(db, runId)!;
  const bp = getActiveBuildplan(db, run.spec_id);

  if (!bp) {
    // No buildplan — fall through to normal single-builder
    log.info("No buildplan found, spawning single builder (resume)");
    const agent = createAgent(db, {
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
    db.prepare("UPDATE agents SET system_prompt = ? WHERE id = ?").run(prompt, agent.id);

    sendBuilderInstructions(db, runId, agent.id, { moduleId: "main", worktreePath: "." });
    createEvent(db, runId, "builder-started", { moduleId: "main" }, agent.id);

    const handle = await runtime.spawn({
      agent_id: agent.id,
      run_id: runId,
      role: "builder",
      name: agent.name,
      system_prompt: prompt,
    });

    updateAgentPid(db, agent.id, handle.pid);
    await waitForAgent(db, runtime, agent.id, handle.pid, pollMs);
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
    const activeCount = (await runtime.listActive()).length;
    const slotsAvailable = config.build.max_parallel - activeCount;

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

      const moduleContracts = listContracts(db, runId, bp.id)
        .filter((c) => {
          const contractDef = plan.contracts.find((cd) => cd.name === c.name);
          return contractDef?.bound_modules.includes(moduleId);
        });
      const contractNames = moduleContracts.map((c) => c.name);

      const agent = createAgent(db, {
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
      db.prepare("UPDATE agents SET system_prompt = ? WHERE id = ?").run(prompt, agent.id);

      for (const contract of moduleContracts) {
        const contractDef = plan.contracts.find((cd) => cd.name === contract.name);
        const bindingRole = contractDef?.binding_roles[moduleId] ?? "consumer";
        createBinding(db, contract.id, agent.id, moduleId, bindingRole);
      }

      const moduleDeps = plan.dependencies.filter((d) => d.from === moduleId);
      for (const dep of moduleDeps) {
        createDependency(db, runId, agent.id, dep.to, dep.type);
      }

      sendBuilderInstructions(db, runId, agent.id, {
        moduleId,
        worktreePath: worktreePath ?? ".",
        contracts: contractNames,
        scope: mod.scope,
      });

      createEvent(db, runId, "builder-started", { moduleId }, agent.id);
      console.log(`[dark] Build phase (resume): spawning builder for module "${moduleId}"`);

      const handle = await runtime.spawn({
        agent_id: agent.id,
        run_id: runId,
        role: "builder",
        name: agent.name,
        module_id: moduleId,
        buildplan_id: bp.id,
        worktree_path: worktreePath ?? undefined,
        system_prompt: prompt,
      });

      updateAgentPid(db, agent.id, handle.pid);
      activeBuilders.set(agent.id, { moduleId, worktreePath });
      console.log(`[dark] Builder "${moduleId}" spawned (PID ${handle.pid})`);
    }

    // Poll for completed/failed builders
    await sleep(pollMs);

    for (const [agentId, info] of activeBuilders) {
      const agentRecord = getAgent(db, agentId);
      if (!agentRecord) continue;

      if (agentRecord.status === "completed") {
        completedModules.add(info.moduleId);
        activeBuilders.delete(agentId);
        createEvent(db, runId, "agent-completed", { moduleId: info.moduleId }, agentId);
        log.info(`Builder completed: ${info.moduleId}`);

        const deps = db.prepare(
          "SELECT id FROM builder_dependencies WHERE run_id = ? AND depends_on_module_id = ? AND satisfied = 0"
        ).all(runId, info.moduleId) as { id: string }[];
        for (const dep of deps) {
          satisfyDependency(db, dep.id);
        }
        continue;
      }

      if (agentRecord.status === "failed") {
        activeBuilders.delete(agentId);
        createEvent(db, runId, "agent-failed", {
          moduleId: info.moduleId,
          error: agentRecord.error,
        }, agentId);
        log.error(`Builder failed for ${info.moduleId}: ${agentRecord.error}`);

        if (info.worktreePath && info.worktreePath !== projectRoot) {
          try { removeWorktree(info.worktreePath); } catch { /* ignore */ }
        }

        throw new Error(`Builder failed for module "${info.moduleId}": ${agentRecord.error ?? "unknown error"}`);
      }

      const runtimeStatus = await runtime.status(agentId);
      if (runtimeStatus === "stopped" || runtimeStatus === "unknown") {
        updateAgentStatus(db, agentId, "failed", "Process exited without completing");
        activeBuilders.delete(agentId);
        createEvent(db, runId, "agent-failed", {
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
    const budgetStatus = checkBudget(db, runId);
    if (budgetStatus.overBudget) {
      throw new Error(`Budget exceeded: $${budgetStatus.spentUsd.toFixed(2)} / $${budgetStatus.budgetUsd.toFixed(2)}`);
    }
  }

  log.info(`All ${plan.modules.length} modules built (${previouslyCompletedModules.size} from previous run)`);
}
