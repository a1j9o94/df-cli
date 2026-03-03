import { Database } from "bun:sqlite";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { SCHEMA_SQL } from "../db/schema.js";
import { findDfDir } from "../utils/config.js";
import { generateDashboardHtml } from "./index.js";
import { getRunQueueInfo, type RunQueueInfo } from "../pipeline/queue-visibility.js";
import { computeElapsedMs, estimateCost } from "../utils/agent-enrichment.js";
import { PHASE_ORDER, shouldSkipPhase, type PhaseName } from "../pipeline/phases.js";
import { parseFrontmatter } from "../utils/frontmatter.js";

// --- Contract: ServerExport ---

export interface ServerConfig {
  port: number;
  dbPath?: string;
  /** Allow injecting a DB instance directly (used in tests) */
  db?: InstanceType<typeof Database>;
}

export interface ServerHandle {
  port: number;
  url: string;
  stop: () => void;
}

// --- Contract: EnrichedRunSummary (extends RunSummary with spec title) ---

interface RunSummary {
  id: string;
  specId: string;
  /** Human-readable spec title from specs table, null if spec not found */
  specTitle: string | null;
  status: string;
  phase: string | null;
  cost: number;
  budget: number;
  elapsed: string;
  moduleCount: number;
  completedCount: number;
  estimatedCost: number;
  error?: string;
  createdAt: string;
  tokensUsed: number;
  /** Present only when the run is in the merge queue */
  mergeQueue?: {
    position: number;
    ahead: number;
    total: number;
  };
}

// --- Contract: AgentSummary ---

interface AgentSummary {
  id: string;
  role: string;
  name: string;
  /** Human-readable display name, e.g. "Builder: HTTP API Server" */
  displayName: string;
  status: string;
  pid: number | null;
  cost: number;
  tokens: number;
  elapsed: string;
  estimatedCost: number;
  isEstimate: boolean;
  moduleId?: string;
  tddPhase?: string;
  tddCycles?: number;
  error?: string;
}

// --- Contract: ModuleStatus ---

interface ModuleStatus {
  id: string;
  title: string;
  description: string;
  agentStatus: string | null;
  tddPhase: string | null;
  tddCycles: number;
  filesChanged: number;
  cost: number;
  tokens: number;
  estimatedCost: number;
  isEstimate: boolean;
  contractsAcknowledged: number;
  contractsTotal: number;
  depsSatisfied: number;
  depsTotal: number;
  /** Scope of files this module creates and modifies */
  scope: {
    creates: string[];
    modifies: string[];
  };
}

// --- Helpers ---

function computeElapsed(createdAt: string, updatedAt?: string): string {
  const start = new Date(createdAt).getTime();
  const end = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSec = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainSec}s`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return `${hours}h ${remainMin}m`;
}

/**
 * Compute estimated cost for an agent based on elapsed time.
 * Only returns > 0 for running/spawning agents with no real cost yet.
 * Pending agents have not started work, so their estimated cost is 0.
 */
function computeAgentEstimatedCost(costUsd: number, createdAt: string, status: string): number {
  if (costUsd !== 0) return 0;
  if (status !== "running" && status !== "spawning") return 0;
  const elapsedMs = computeElapsedMs(createdAt, status);
  return estimateCost(elapsedMs);
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// --- Run validation helper ---

function validateRun(
  db: InstanceType<typeof Database>,
  runId: string,
): { error: Response } | { run: Record<string, unknown> } {
  const run = db.prepare("SELECT * FROM runs WHERE id = ?").get(runId) as Record<
    string,
    unknown
  > | null;
  if (!run) {
    return { error: errorResponse(`Run not found: ${runId}`, 404) };
  }
  return { run };
}

// --- Route handlers ---

function handleListRuns(db: InstanceType<typeof Database>): Response {
  const rows = db.prepare("SELECT * FROM runs ORDER BY created_at DESC").all() as Record<
    string,
    unknown
  >[];

  const summaries: RunSummary[] = rows.map((r) => toRunSummary(db, r));
  return jsonResponse(summaries);
}

/** Resolve spec title from specs table, falling back to specId */
function resolveSpecTitle(db: InstanceType<typeof Database>, specId: string): string {
  const spec = db.prepare("SELECT title FROM specs WHERE id = ?").get(specId) as { title: string } | null;
  return spec?.title ?? specId;
}

function toRunSummary(db: InstanceType<typeof Database>, r: Record<string, unknown>): RunSummary {
  const runId = r.id as string;
  const specId = r.spec_id as string;

  // Look up spec title from specs table
  const specRow = db
    .prepare("SELECT title FROM specs WHERE id = ?")
    .get(specId) as { title: string } | null;
  const specTitle = specRow?.title ?? null;

  // Compute moduleCount and completedCount from buildplan + agents
  let moduleCount = 0;
  let completedCount = 0;

  const plan = db
    .prepare(
      "SELECT * FROM buildplans WHERE run_id = ? AND status = 'active' ORDER BY version DESC LIMIT 1",
    )
    .get(runId) as Record<string, unknown> | null;

  if (plan) {
    try {
      const parsed = JSON.parse(plan.plan as string);
      moduleCount = parsed.modules?.length ?? 0;
    } catch {
      moduleCount = (plan.module_count as number) ?? 0;
    }
  }

  // Count completed distinct modules for this run (not total builders, to avoid double-counting retries)
  completedCount = (
    db
      .prepare(
        "SELECT COUNT(DISTINCT module_id) as cnt FROM agents WHERE run_id = ? AND role = 'builder' AND status = 'completed'",
      )
      .get(runId) as { cnt: number }
  ).cnt;

  // Compute estimated cost for this run by summing estimates across all agents
  const agentRows = db
    .prepare("SELECT status, cost_usd, created_at FROM agents WHERE run_id = ?")
    .all(runId) as Array<{ status: string; cost_usd: number; created_at: string }>;

  let runEstimatedCost = 0;
  for (const agent of agentRows) {
    runEstimatedCost += computeAgentEstimatedCost(agent.cost_usd, agent.created_at, agent.status);
  }

  const updatedAt =
    r.status === "running" || r.status === "pending" ? undefined : (r.updated_at as string);

  const summary: RunSummary = {
    id: runId,
    specId: specId,
    specTitle,
    status: r.status as string,
    phase: (r.current_phase as string) ?? null,
    cost: r.cost_usd as number,
    budget: r.budget_usd as number,
    elapsed: computeElapsed(r.created_at as string, updatedAt),
    moduleCount,
    completedCount,
    estimatedCost: runEstimatedCost,
    createdAt: r.created_at as string,
    tokensUsed: r.tokens_used as number,
  };

  if (r.error) {
    summary.error = r.error as string;
  }

  // Add merge queue info if the run is in the queue
  const queueInfo = getRunQueueInfo(db, runId);
  if (queueInfo) {
    summary.mergeQueue = {
      position: queueInfo.position,
      ahead: queueInfo.ahead,
      total: queueInfo.total,
    };
  }

  return summary;
}

function handleGetRun(db: InstanceType<typeof Database>, runId: string): Response {
  const result = validateRun(db, runId);
  if ("error" in result) return result.error;

  return jsonResponse(toRunSummary(db, result.run));
}

/** Build a human-readable display name for an agent, e.g. "Builder: HTTP API Server" */
function buildAgentDisplayName(
  db: InstanceType<typeof Database>,
  runId: string,
  role: string,
  moduleId: string | null,
): string {
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);

  if (moduleId && role === "builder") {
    // Try to resolve module title from buildplan
    const plan = db
      .prepare(
        "SELECT plan FROM buildplans WHERE run_id = ? AND status = 'active' ORDER BY version DESC LIMIT 1",
      )
      .get(runId) as { plan: string } | null;

    if (plan) {
      try {
        const parsed = JSON.parse(plan.plan);
        const mod = parsed.modules?.find((m: { id: string }) => m.id === moduleId);
        if (mod?.title) {
          return `Builder: ${mod.title}`;
        }
      } catch {
        // fall through
      }
    }
    return `Builder: ${moduleId}`;
  }

  return roleName;
}

function handleGetAgents(db: InstanceType<typeof Database>, runId: string): Response {
  const result = validateRun(db, runId);
  if ("error" in result) return result.error;

  const rows = db
    .prepare("SELECT * FROM agents WHERE run_id = ? ORDER BY created_at DESC")
    .all(runId) as Record<string, unknown>[];

  const agents: AgentSummary[] = rows.map((a) => {
    const updatedAt =
      a.status === "running" || a.status === "pending" ? undefined : (a.updated_at as string);

    const agentCost = a.cost_usd as number;
    const agentStatus = a.status as string;
    const agentRole = a.role as string;
    const agentModuleId = (a.module_id as string) ?? null;
    const estCost = computeAgentEstimatedCost(agentCost, a.created_at as string, agentStatus);
    const isEstimate = agentCost === 0 && estCost > 0;

    const summary: AgentSummary = {
      id: a.id as string,
      role: agentRole,
      name: a.name as string,
      displayName: buildAgentDisplayName(db, runId, agentRole, agentModuleId),
      status: agentStatus,
      pid: (a.pid as number) ?? null,
      cost: agentCost,
      tokens: a.tokens_used as number,
      elapsed: computeElapsed(a.created_at as string, updatedAt),
      estimatedCost: estCost,
      isEstimate,
    };

    if (a.module_id) summary.moduleId = a.module_id as string;
    if (a.tdd_phase) summary.tddPhase = a.tdd_phase as string;
    if (a.tdd_cycles != null && (a.tdd_cycles as number) > 0)
      summary.tddCycles = a.tdd_cycles as number;
    if (a.error) summary.error = a.error as string;

    return summary;
  });

  return jsonResponse(agents);
}

function handleGetBuildplan(db: InstanceType<typeof Database>, runId: string): Response {
  const result = validateRun(db, runId);
  if ("error" in result) return result.error;

  const plan = db
    .prepare(
      "SELECT * FROM buildplans WHERE run_id = ? AND status = 'active' ORDER BY version DESC LIMIT 1",
    )
    .get(runId) as Record<string, unknown> | null;

  if (!plan) {
    return errorResponse(`No active buildplan found for run: ${runId}`, 404);
  }

  try {
    const parsed = JSON.parse(plan.plan as string);
    return jsonResponse({
      id: plan.id,
      version: plan.version,
      status: plan.status,
      modules: parsed.modules,
      contracts: parsed.contracts,
      dependencies: parsed.dependencies,
      parallelism: parsed.parallelism,
      integrationStrategy: parsed.integration_strategy,
      risks: parsed.risks,
      estimatedDurationMin: plan.estimated_duration_min,
      estimatedCostUsd: plan.estimated_cost_usd,
      estimatedTokens: plan.estimated_tokens,
    });
  } catch {
    return errorResponse("Failed to parse buildplan", 500);
  }
}

function handleGetEvents(db: InstanceType<typeof Database>, runId: string): Response {
  const result = validateRun(db, runId);
  if ("error" in result) return result.error;

  const rows = db
    .prepare("SELECT * FROM events WHERE run_id = ? ORDER BY created_at DESC, rowid DESC")
    .all(runId) as Record<string, unknown>[];

  const events = rows.map((e) => ({
    id: e.id as string,
    runId: e.run_id as string,
    agentId: (e.agent_id as string) ?? null,
    type: e.type as string,
    data: e.data ? JSON.parse(e.data as string) : null,
    createdAt: e.created_at as string,
  }));

  return jsonResponse(events);
}

function handleGetScenarios(db: InstanceType<typeof Database>, runId: string): Response {
  const result = validateRun(db, runId);
  if ("error" in result) return result.error;

  // Scenarios are stored in .df/scenarios/ as files, and evaluation results
  // come from events. For now, return evaluation-related events as scenario results.
  const evalEvents = db
    .prepare(
      "SELECT * FROM events WHERE run_id = ? AND type IN ('evaluation-started', 'evaluation-passed', 'evaluation-failed') ORDER BY created_at DESC",
    )
    .all(runId) as Record<string, unknown>[];

  const scenarios = evalEvents.map((e) => ({
    id: e.id as string,
    type: e.type as string,
    data: e.data ? JSON.parse(e.data as string) : null,
    createdAt: e.created_at as string,
  }));

  return jsonResponse(scenarios);
}

// --- Contract: SpecContentEndpoint ---

function handleGetSpec(db: InstanceType<typeof Database>, runId: string): Response {
  const result = validateRun(db, runId);
  if ("error" in result) return result.error;

  const run = result.run;
  const specId = run.spec_id as string;

  // Look up spec record from database
  const spec = db.prepare("SELECT * FROM specs WHERE id = ?").get(specId) as Record<
    string,
    unknown
  > | null;
  if (!spec) {
    return errorResponse(`Spec not found: ${specId}`, 404);
  }

  const filePath = spec.file_path as string;

  // Resolve file path (could be relative to project root)
  const resolvedPath = resolve(filePath);
  if (!existsSync(resolvedPath)) {
    return errorResponse(`Spec file not found: ${filePath}`, 404);
  }

  // Read and parse spec content
  const raw = readFileSync(resolvedPath, "utf-8");
  const { data: frontmatter, body } = parseFrontmatter<Record<string, unknown>>(raw);

  return jsonResponse({
    id: specId,
    title: (frontmatter.title as string) ?? (spec.title as string),
    type: (frontmatter.type as string) ?? null,
    status: (frontmatter.status as string) ?? (spec.status as string),
    version: (frontmatter.version as string) ?? null,
    priority: (frontmatter.priority as string) ?? null,
    content: body.trim(),
  });
}

function handleGetModules(db: InstanceType<typeof Database>, runId: string): Response {
  const result = validateRun(db, runId);
  if ("error" in result) return result.error;

  // Get active buildplan to extract module definitions
  const plan = db
    .prepare(
      "SELECT * FROM buildplans WHERE run_id = ? AND status = 'active' ORDER BY version DESC LIMIT 1",
    )
    .get(runId) as Record<string, unknown> | null;

  if (!plan) {
    return jsonResponse([]);
  }

  let modules: Array<{
    id: string;
    title: string;
    description: string;
    scope?: { creates?: string[]; modifies?: string[] };
  }>;
  try {
    const parsed = JSON.parse(plan.plan as string);
    modules = parsed.modules ?? [];
  } catch {
    return jsonResponse([]);
  }

  const moduleStatuses: ModuleStatus[] = modules.map((mod) => {
    // Find the LATEST builder agent assigned to this module (most recent on retry)
    const agent = db
      .prepare("SELECT * FROM agents WHERE run_id = ? AND module_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(runId, mod.id) as Record<string, unknown> | null;

    // Count contract bindings for the agent
    let contractsAcknowledged = 0;
    let contractsTotal = 0;
    let depsSatisfied = 0;
    let depsTotal = 0;

    if (agent) {
      const ackResult = db
        .prepare(
          "SELECT COUNT(*) as cnt FROM contract_bindings WHERE agent_id = ? AND acknowledged = 1",
        )
        .get(agent.id as string) as { cnt: number };
      contractsAcknowledged = ackResult.cnt;

      const totalResult = db
        .prepare("SELECT COUNT(*) as cnt FROM contract_bindings WHERE agent_id = ?")
        .get(agent.id as string) as { cnt: number };
      contractsTotal = totalResult.cnt;

      const depSatResult = db
        .prepare(
          "SELECT COUNT(*) as cnt FROM builder_dependencies WHERE builder_id = ? AND satisfied = 1",
        )
        .get(agent.id as string) as { cnt: number };
      depsSatisfied = depSatResult.cnt;

      const depTotalResult = db
        .prepare("SELECT COUNT(*) as cnt FROM builder_dependencies WHERE builder_id = ?")
        .get(agent.id as string) as { cnt: number };
      depsTotal = depTotalResult.cnt;
    }

    const filesChanged = mod.scope?.creates?.length ?? 0;
    const modCost = agent ? (agent.cost_usd as number) : 0;
    const modStatus = agent ? (agent.status as string) : "";
    const modEstCost = agent
      ? computeAgentEstimatedCost(modCost, agent.created_at as string, modStatus)
      : 0;
    const modIsEstimate = modCost === 0 && modEstCost > 0;

    return {
      id: mod.id,
      title: mod.title,
      description: mod.description,
      agentStatus: agent ? (agent.status as string) : null,
      tddPhase: agent ? ((agent.tdd_phase as string) ?? null) : null,
      tddCycles: agent ? (agent.tdd_cycles as number) : 0,
      filesChanged,
      cost: modCost,
      tokens: agent ? (agent.tokens_used as number) : 0,
      estimatedCost: modEstCost,
      isEstimate: modIsEstimate,
      contractsAcknowledged,
      contractsTotal,
      depsSatisfied,
      depsTotal,
      scope: {
        creates: mod.scope?.creates ?? [],
        modifies: mod.scope?.modifies ?? [],
      },
    };
  });

  return jsonResponse(moduleStatuses);
}

// --- Contract: SpecContentEndpoint ---

function handleGetSpec(db: InstanceType<typeof Database>, runId: string): Response {
  const result = validateRun(db, runId);
  if ("error" in result) return result.error;

  const run = result.run;
  const specId = run.spec_id as string;

  // Look up spec metadata from specs table
  const spec = db.prepare("SELECT * FROM specs WHERE id = ?").get(specId) as Record<string, unknown> | null;

  if (!spec) {
    return jsonResponse({
      specId,
      title: specId,
      content: null,
    });
  }

  return jsonResponse({
    specId,
    title: spec.title as string,
    status: spec.status as string,
    scenarioCount: spec.scenario_count as number,
  });
}

// --- Phase labels ---

const PHASE_LABELS: Record<string, string> = {
  scout: "Scout",
  architect: "Architect",
  "plan-review": "Plan Review",
  build: "Build",
  integrate: "Integrate",
  "evaluate-functional": "Evaluate",
  "evaluate-change": "Change Eval",
  merge: "Merge",
};

function handleGetPhases(db: InstanceType<typeof Database>, runId: string): Response {
  const result = validateRun(db, runId);
  if ("error" in result) return result.error;

  const run = result.run;
  const currentPhase = (run.current_phase as string) ?? null;
  const skipChangeEval = (run.skip_change_eval as number) === 1;

  // Determine module count from buildplan
  let moduleCount = 0;
  const plan = db
    .prepare(
      "SELECT module_count FROM buildplans WHERE run_id = ? AND status = 'active' ORDER BY version DESC LIMIT 1",
    )
    .get(runId) as { module_count: number } | null;
  if (plan) {
    moduleCount = plan.module_count;
  }

  // Determine skip_architect from run config
  let skipArchitect = false;
  try {
    const config = JSON.parse((run.config as string) ?? "{}");
    skipArchitect = config.skip_architect === true;
  } catch {
    // ignore parse errors
  }

  const skipContext = {
    skip_architect: skipArchitect,
    module_count: moduleCount,
    skip_change_eval: skipChangeEval,
  };

  const currentIdx = currentPhase ? PHASE_ORDER.indexOf(currentPhase as PhaseName) : -1;

  const phases = PHASE_ORDER.map((phaseId, idx) => {
    const isSkipped = shouldSkipPhase(phaseId, skipContext);

    let status: "completed" | "active" | "pending" | "skipped";
    if (isSkipped) {
      status = "skipped";
    } else if (currentIdx >= 0 && idx < currentIdx) {
      status = "completed";
    } else if (currentIdx >= 0 && idx === currentIdx) {
      status = "active";
    } else {
      status = "pending";
    }

    return {
      id: phaseId,
      label: PHASE_LABELS[phaseId] ?? phaseId,
      status,
    };
  });

  return jsonResponse(phases);
}

// --- URL Router ---

function route(
  db: InstanceType<typeof Database>,
  req: Request,
  getDashboardHtml: () => string,
): Response {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // HTML root
  if (path === "/" || path === "") {
    return htmlResponse(getDashboardHtml());
  }

  // API routes
  if (path === "/api/runs") {
    return handleListRuns(db);
  }

  // Match /api/runs/:id and /api/runs/:id/subroute
  const runMatch = path.match(/^\/api\/runs\/([^/]+)$/);
  if (runMatch) {
    return handleGetRun(db, runMatch[1]);
  }

  const runSubMatch = path.match(/^\/api\/runs\/([^/]+)\/([^/]+)$/);
  if (runSubMatch) {
    const [, runId, sub] = runSubMatch;
    switch (sub) {
      case "agents":
        return handleGetAgents(db, runId);
      case "buildplan":
        return handleGetBuildplan(db, runId);
      case "events":
        return handleGetEvents(db, runId);
      case "scenarios":
        return handleGetScenarios(db, runId);
      case "spec":
        return handleGetSpec(db, runId);
      case "modules":
        return handleGetModules(db, runId);
      case "phases":
        return handleGetPhases(db, runId);
      case "spec":
        return handleGetSpec(db, runId);
      default:
        return errorResponse(`Unknown sub-resource: ${sub}`, 404);
    }
  }

  return errorResponse(`Not found: ${path}`, 404);
}

// --- Server startup ---

export async function startServer(config: ServerConfig): Promise<ServerHandle> {
  const port = config.port;

  // Get or create DB
  let db: InstanceType<typeof Database>;

  if (config.db) {
    // Direct DB injection (testing)
    db = config.db;
  } else if (config.dbPath) {
    db = new Database(config.dbPath);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(SCHEMA_SQL);
  } else {
    const dfDir = findDfDir();
    if (!dfDir) {
      throw new Error("Not in a Dark Factory project. Run 'dark init' first.");
    }
    const dbPath = join(dfDir, "state.db");
    db = new Database(dbPath);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(SCHEMA_SQL);
  }

  const getDashboardHtml = () => generateDashboardHtml({ projectName: "Dark Factory" });

  const server = Bun.serve({
    port,
    fetch(req: Request): Response {
      try {
        return route(db, req, getDashboardHtml);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        return errorResponse(message, 500);
      }
    },
  });

  const actualPort = server.port ?? port;

  return {
    port: actualPort,
    url: `http://localhost:${actualPort}`,
    stop: () => {
      server.stop(true);
    },
  };
}
