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
import { createWorktree, removeWorktree, getWorktreeCommits, worktreeHasCommits } from "../runtime/worktree.js";
import { getFailedBuilderWorktree } from "./resume.js";
import { findDfDir } from "../utils/config.js";
import { existsSync } from "node:fs";

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
 * Send builder-specific instructions via the mail system.
 * If previousCommits is provided, includes them in the instructions
 * so the builder knows what was already done by a previous attempt.
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
  const previousCommits = context.previousCommits as { hash: string; message: string }[] | undefined;

  const lines = [
    "# Builder Instructions",
    "",
    `## Module: ${moduleId}`,
    `## Worktree: ${worktreePath}`,
    scope ? "## Scope:" : "",
    scope?.creates?.length ? `- Creates: ${scope.creates.join(", ")}` : "",
    scope?.modifies?.length ? `- Modifies: ${scope.modifies.join(", ")}` : "",
    scope?.test_files?.length ? `- Tests: ${scope.test_files.join(", ")}` : "",
    contracts?.length ? `## Contracts: ${contracts.join(", ")}` : "",
  ];

  // Include previous attempt's commits if worktree was reused
  if (previousCommits && previousCommits.length > 0) {
    lines.push("");
    lines.push("## Previous Attempt");
    lines.push("A previous builder made the following commits before it crashed.");
    lines.push("These commits are already in your worktree. Continue from where it left off.");
    lines.push("");
    for (const commit of previousCommits) {
      lines.push(`- ${commit.hash.slice(0, 8)} ${commit.message}`);
    }
  }

  lines.push("");
  lines.push("## Steps");
  if (previousCommits && previousCommits.length > 0) {
    lines.push("1. Review the previous commits in this worktree (they are already applied)");
    lines.push("2. Determine what remains to be implemented");
    lines.push("3. Follow TDD: write a failing test, make it pass, refactor");
    lines.push("4. Implement remaining functionality defined in your module scope");
    lines.push("5. Commit your work in the worktree");
    lines.push(`6. Mark yourself complete: dark agent complete ${agentId}`);
  } else {
    lines.push("1. Read this assignment and understand your module scope");
    lines.push("2. Follow TDD: write a failing test, make it pass, refactor");
    lines.push("3. Implement all functionality defined in your module scope");
    lines.push("4. Commit your work in the worktree");
    lines.push(`5. Mark yourself complete: dark agent complete ${agentId}`);
  }

  lines.push("");
  lines.push("If you cannot complete this work, call:");
  lines.push(`dark agent fail ${agentId} --error "<description>"`);

  createMessage(db, runId, "orchestrator", lines.join("\n"), { toAgentId: agentId });
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
        // Cost tracking is now handled at the command layer (estimateAndRecordCost)
        // No engine-side estimation needed — every agent command records cost automatically
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

        // Preserve worktree for retry — do NOT remove it.
        // The worktree may contain partial commits from this attempt.
        // On resume, the next builder will inherit this worktree.
        if (info.worktreePath && info.worktreePath !== projectRoot) {
          log.info(`Preserving worktree for ${info.moduleId}: ${info.worktreePath}`);
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

        // Preserve worktree for retry — do NOT remove it.
        if (info.worktreePath && info.worktreePath !== projectRoot) {
          log.info(`Preserving worktree for ${info.moduleId}: ${info.worktreePath}`);
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

      // Try to reuse worktree from a previous failed builder for this module
      let worktreePath: string | null = null;
      let previousCommits: { hash: string; message: string }[] = [];
      const previousWorktree = getFailedBuilderWorktree(db, runId, moduleId);

      if (previousWorktree && existsSync(previousWorktree)) {
        // Reuse the existing worktree — it may contain partial work (commits)
        worktreePath = previousWorktree;
        previousCommits = getWorktreeCommits(previousWorktree);
        if (previousCommits.length > 0) {
          log.info(`Reusing worktree for ${moduleId} with ${previousCommits.length} previous commits: ${worktreePath}`);
        } else {
          log.info(`Reusing worktree for ${moduleId} (no previous commits): ${worktreePath}`);
        }
      } else {
        // Create a fresh worktree
        const runShort = runId.slice(0, 8);
        const suffix = Date.now().toString(36);
        const branchName = `df-build/${runShort}/${moduleId}-${suffix}`;
        const worktreeDir = join(tmpdir(), "df-worktrees", `${moduleId}-${suffix}`);

        try {
          const wt = createWorktree(projectRoot, branchName, worktreeDir);
          worktreePath = wt.path;
          log.info(`Worktree created for ${moduleId}: ${worktreePath}`);
        } catch (err) {
          log.warn(`Failed to create worktree for ${moduleId}, using project root: ${err}`);
          worktreePath = projectRoot;
        }
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

      // Send instructions, including previous commit info if this is a reused worktree
      sendBuilderInstructions(db, runId, agent.id, {
        moduleId,
        worktreePath: worktreePath ?? ".",
        contracts: contractNames,
        scope: mod.scope,
        previousCommits,
      });

      createEvent(db, runId, "builder-started", { moduleId, reusedWorktree: previousCommits.length > 0 }, agent.id);
      console.log(`[dark] Build phase (resume): spawning builder for module "${moduleId}"${previousCommits.length > 0 ? ` (reusing worktree with ${previousCommits.length} commits)` : ""}`);

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

        // Preserve worktree for next retry
        if (info.worktreePath && info.worktreePath !== projectRoot) {
          log.info(`Preserving worktree for ${info.moduleId}: ${info.worktreePath}`);
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

        // Preserve worktree for next retry
        if (info.worktreePath && info.worktreePath !== projectRoot) {
          log.info(`Preserving worktree for ${info.moduleId}: ${info.worktreePath}`);
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
