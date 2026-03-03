import { Database } from "bun:sqlite";
import { join } from "node:path";
import { SCHEMA_SQL } from "../db/schema.js";
import { findDfDir } from "../utils/config.js";
import { generateDashboardHtml } from "./index.js";
import { getRunQueueInfo, type RunQueueInfo } from "../pipeline/queue-visibility.js";
import { computeElapsedMs, estimateCost } from "../utils/agent-enrichment.js";

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

// --- Contract: RunSummary (extended with RunSummaryQueueExtension) ---

interface RunSummary {
  id: string;
  specId: string;
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
  status: string;
  pid: number | null;
  cost: number;
  tokens: number;
  elapsed: string;
  estimatedCost: number;
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
  contractsAcknowledged: number;
  contractsTotal: number;
  depsSatisfied: number;
  depsTotal: number;
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
 * Only returns > 0 for active agents (pending/spawning/running) with no real cost yet.
 */
function computeAgentEstimatedCost(costUsd: number, createdAt: string, status: string): number {
  if (costUsd !== 0) return 0;
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

function toRunSummary(db: InstanceType<typeof Database>, r: Record<string, unknown>): RunSummary {
  const runId = r.id as string;

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
    specId: r.spec_id as string,
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

    const summary: AgentSummary = {
      id: a.id as string,
      role: a.role as string,
      name: a.name as string,
      status: agentStatus,
      pid: (a.pid as number) ?? null,
      cost: agentCost,
      tokens: a.tokens_used as number,
      elapsed: computeElapsed(a.created_at as string, updatedAt),
      estimatedCost: computeAgentEstimatedCost(agentCost, a.created_at as string, agentStatus),
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
    scope?: { creates?: string[] };
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

    return {
      id: mod.id,
      title: mod.title,
      description: mod.description,
      agentStatus: agent ? (agent.status as string) : null,
      tddPhase: agent ? ((agent.tdd_phase as string) ?? null) : null,
      tddCycles: agent ? (agent.tdd_cycles as number) : 0,
      filesChanged,
      cost: agent ? (agent.cost_usd as number) : 0,
      tokens: agent ? (agent.tokens_used as number) : 0,
      contractsAcknowledged,
      contractsTotal,
      depsSatisfied,
      depsTotal,
    };
  });

  return jsonResponse(moduleStatuses);
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
      case "modules":
        return handleGetModules(db, runId);
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
