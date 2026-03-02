/**
 * Rich instruction context gatherer for post-build agents.
 *
 * Queries the DB and filesystem to gather comprehensive context
 * for integration-tester, evaluator, and merger agents.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import type { SqliteDb } from "../db/index.js";
import type { Buildplan, DependencyEdge } from "../types/index.js";
import type { AgentRecord, ContractRecord } from "../types/index.js";
import { getRun } from "../db/queries/runs.js";
import { getActiveBuildplan } from "../db/queries/buildplans.js";
import { listAgents } from "../db/queries/agents.js";
import { listContracts, getBindingsForContract } from "../db/queries/contracts.js";
import { getSpec } from "../db/queries/specs.js";

// ============================================================
// Exported interfaces (per InstructionContextContract)
// ============================================================

export interface ModuleInfo {
  id: string;
  title: string;
  description: string;
  scope: { creates: string[]; modifies: string[]; test_files: string[] };
}

export interface BuilderInfo {
  agentId: string;
  moduleId: string;
  worktreePath: string;
  branchName: string;
  filesChanged: string[];
  status: string;
}

export interface ContractInfo {
  name: string;
  description: string;
  format: string;
  content: string;
  boundModules: string[];
}

export interface ScenarioInfo {
  name: string;
  type: "functional" | "change";
  filePath: string;
  content: string;
}

export interface IntegrationTesterContext {
  modules: ModuleInfo[];
  builders: BuilderInfo[];
  contracts: ContractInfo[];
  dependencyGraph: { from: string; to: string; type: string }[];
  integrationStrategy: {
    checkpoints: { after_phase: number; test: string; modules_involved: string[] }[];
    final_integration: string;
  };
  testCommand: string;
}

export interface EvaluatorContext {
  scenarios: ScenarioInfo[];
  specContent: string;
  modules: ModuleInfo[];
  builders: BuilderInfo[];
  testCommand: string;
  runCommand: string;
}

export interface MergerContext {
  builders: BuilderInfo[];
  dependencyOrder: string[];
  targetBranch: string;
  knownConflicts: string[];
  postMergeValidation: string;
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Get the active buildplan for a run, throwing if not found.
 */
function getActivePlan(db: SqliteDb, runId: string): { plan: Buildplan; buildplanId: string; specId: string } {
  const run = getRun(db, runId);
  if (!run) throw new Error(`Run not found: ${runId}`);

  const bp = getActiveBuildplan(db, run.spec_id);
  if (!bp) throw new Error(`No active buildplan for run: ${runId}`);

  const plan: Buildplan = JSON.parse(bp.plan);
  return { plan, buildplanId: bp.id, specId: run.spec_id };
}

/**
 * Convert buildplan modules into ModuleInfo array.
 */
function extractModules(plan: Buildplan): ModuleInfo[] {
  return plan.modules.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    scope: {
      creates: m.scope.creates,
      modifies: m.scope.modifies,
      test_files: m.scope.test_files,
    },
  }));
}

/**
 * Get builder agents for a run and convert to BuilderInfo.
 * Attempts to derive branch name from worktree path.
 */
function extractBuilders(db: SqliteDb, runId: string): BuilderInfo[] {
  const agents = listAgents(db, runId, "builder");
  return agents
    .filter((a: AgentRecord) => a.module_id != null)
    .map((a: AgentRecord) => ({
      agentId: a.id,
      moduleId: a.module_id!,
      worktreePath: a.worktree_path ?? "",
      branchName: deriveBranchName(a.worktree_path),
      filesChanged: extractFilesChanged(a.worktree_path),
      status: a.status,
    }));
}

/**
 * Derive a branch name from a worktree path.
 * The convention is: df-build/{runShort}/{moduleId}-{suffix}
 * and worktree paths follow /tmp/df-worktrees/{name}.
 */
function deriveBranchName(worktreePath: string | null): string {
  if (!worktreePath) return "";
  // Extract the last segment of the worktree path as the branch hint
  const segments = worktreePath.split("/");
  const last = segments[segments.length - 1] || "";
  return last ? `df-build/${last}` : "";
}

/**
 * Attempt to get changed files from a worktree using git diff.
 * Returns empty array if worktree doesn't exist or git fails.
 */
function extractFilesChanged(worktreePath: string | null): string[] {
  if (!worktreePath) return [];
  try {
    if (!existsSync(worktreePath)) return [];
    const output = execSync("git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only HEAD", {
      cwd: worktreePath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Extract contracts from DB for a run, enriching with bound module info.
 */
function extractContracts(db: SqliteDb, runId: string): ContractInfo[] {
  const contracts = listContracts(db, runId);
  return contracts.map((c: ContractRecord) => {
    const bindings = getBindingsForContract(db, c.id);
    const boundModules = bindings.map((b) => b.module_id);
    return {
      name: c.name,
      description: c.description,
      format: c.format,
      content: c.content,
      boundModules,
    };
  });
}

/**
 * Read scenario files from .df/scenarios/ directories.
 * Gracefully returns empty array if directories don't exist.
 */
function readScenarios(basePath?: string): ScenarioInfo[] {
  const scenarios: ScenarioInfo[] = [];
  const dfDir = basePath ?? join(process.cwd(), ".df");
  const scenarioDir = join(dfDir, "scenarios");

  if (!existsSync(scenarioDir)) return scenarios;

  for (const type of ["functional", "change"] as const) {
    const typeDir = join(scenarioDir, type);
    if (!existsSync(typeDir)) continue;

    try {
      const files = readdirSync(typeDir);
      for (const file of files) {
        if (!file.endsWith(".md")) continue;
        const filePath = join(typeDir, file);
        let content = "";
        try {
          content = readFileSync(filePath, "utf-8");
        } catch {
          content = `(Could not read scenario file: ${filePath})`;
        }
        scenarios.push({
          name: file.replace(/\.md$/, ""),
          type,
          filePath,
          content,
        });
      }
    } catch {
      // Directory read failed, skip
    }
  }

  return scenarios;
}

/**
 * Read the spec file content, returning a fallback message if not available.
 */
function readSpecContent(db: SqliteDb, specId: string): string {
  const spec = getSpec(db, specId);
  if (!spec) return `(Spec not found: ${specId})`;

  try {
    return readFileSync(spec.file_path, "utf-8");
  } catch {
    return `(Could not read spec file: ${spec.file_path})`;
  }
}

/**
 * Topological sort of module IDs based on dependency edges.
 * Returns modules in dependency order (dependencies first).
 */
function topologicalSort(modules: ModuleInfo[], deps: DependencyEdge[]): string[] {
  const moduleIdList = modules.map((m) => m.id);
  const moduleIdSet = new Set(moduleIdList);
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Initialize
  for (let i = 0; i < moduleIdList.length; i++) {
    const id = moduleIdList[i];
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  // Build adjacency (to -> from means "to" must come before "from")
  for (const dep of deps) {
    if (moduleIdSet.has(dep.from) && moduleIdSet.has(dep.to)) {
      adjacency.get(dep.to)!.push(dep.from);
      inDegree.set(dep.from, (inDegree.get(dep.from) ?? 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  const entries = Array.from(inDegree.entries());
  for (let i = 0; i < entries.length; i++) {
    if (entries[i][1] === 0) queue.push(entries[i][0]);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    const neighbors = adjacency.get(current) ?? [];
    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If not all modules were sorted (cycle), append remaining
  for (let i = 0; i < moduleIdList.length; i++) {
    if (!sorted.includes(moduleIdList[i])) {
      sorted.push(moduleIdList[i]);
    }
  }

  return sorted;
}

/**
 * Find known conflicts by checking if multiple builders modify the same files.
 */
function findKnownConflicts(plan: Buildplan): string[] {
  const conflicts: string[] = [];
  const fileToModules = new Map<string, string[]>();

  for (const mod of plan.modules) {
    for (const file of mod.scope.modifies) {
      const existing = fileToModules.get(file) ?? [];
      existing.push(mod.id);
      fileToModules.set(file, existing);
    }
  }

  const fileEntries = Array.from(fileToModules.entries());
  for (let i = 0; i < fileEntries.length; i++) {
    const [file, modules] = fileEntries[i];
    if (modules.length > 1) {
      conflicts.push(`${file} (modified by: ${modules.join(", ")})`);
    }
  }

  return conflicts;
}

// ============================================================
// Exported gather functions
// ============================================================

/**
 * Gather comprehensive context for the integration-tester agent.
 */
export function gatherIntegrationTesterContext(db: SqliteDb, runId: string): IntegrationTesterContext {
  const { plan } = getActivePlan(db, runId);

  return {
    modules: extractModules(plan),
    builders: extractBuilders(db, runId),
    contracts: extractContracts(db, runId),
    dependencyGraph: plan.dependencies.map((d) => ({
      from: d.from,
      to: d.to,
      type: d.type,
    })),
    integrationStrategy: {
      checkpoints: plan.integration_strategy.checkpoints.map((cp) => ({
        after_phase: cp.after_phase,
        test: cp.test,
        modules_involved: cp.modules_involved,
      })),
      final_integration: plan.integration_strategy.final_integration,
    },
    testCommand: "bun test",
  };
}

/**
 * Gather comprehensive context for the evaluator agent.
 */
export function gatherEvaluatorContext(db: SqliteDb, runId: string): EvaluatorContext {
  const { plan, specId } = getActivePlan(db, runId);

  return {
    scenarios: readScenarios(),
    specContent: readSpecContent(db, specId),
    modules: extractModules(plan),
    builders: extractBuilders(db, runId),
    testCommand: "bun test",
    runCommand: "bun run dev",
  };
}

/**
 * Gather comprehensive context for the merger agent.
 */
export function gatherMergerContext(db: SqliteDb, runId: string, targetBranch: string): MergerContext {
  const { plan } = getActivePlan(db, runId);

  const modules = extractModules(plan);
  const depOrder = topologicalSort(modules, plan.dependencies);
  const builders = extractBuilders(db, runId);

  // Sort builders according to dependency order
  const sortedBuilders = depOrder
    .map((modId) => builders.find((b) => b.moduleId === modId))
    .filter((b): b is BuilderInfo => b != null);

  // Add any builders not in the dependency order (e.g., no module_id match)
  for (const builder of builders) {
    if (!sortedBuilders.find((b) => b.agentId === builder.agentId)) {
      sortedBuilders.push(builder);
    }
  }

  return {
    builders: sortedBuilders,
    dependencyOrder: depOrder,
    targetBranch,
    knownConflicts: findKnownConflicts(plan),
    postMergeValidation: "bun test",
  };
}
