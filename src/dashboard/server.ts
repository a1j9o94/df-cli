import { Database } from "bun:sqlite";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { SCHEMA_SQL } from "../db/schema.js";
import { findDfDir } from "../utils/config.js";
import { formatJson } from "../utils/format.js";
import { generateDashboardHtml } from "./index.js";
import { getRunQueueInfo, type RunQueueInfo } from "../pipeline/queue-visibility.js";
import { computeElapsedMs, estimateCost } from "../utils/agent-enrichment.js";
import { PHASE_ORDER, shouldSkipPhase, type PhaseName } from "../pipeline/phases.js";
import { parseFrontmatter, serializeFrontmatter } from "../utils/frontmatter.js";
import { newSpecId, newRunId } from "../utils/id.js";
import { listBlockersByRun, getBlocker, resolveBlocker } from "../db/queries/blockers.js";
import { encryptSecret, getEncryptionKey } from "../utils/secrets.js";
import type { BlockerStatus } from "../types/blocker.js";
import { RateLimiter } from "./rate-limiter.js";
import { RequestLogger } from "./request-logger.js";

// --- Contract: ServerExport ---

export interface ServerConfig {
  port: number;
  dbPath?: string;
  /** Allow injecting a DB instance directly (used in tests) */
  db?: InstanceType<typeof Database>;
  /** Directory where spec files are stored (used for creating new specs via API) */
  specsDir?: string;
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
  /** Reason the run was paused, null if not paused */
  pauseReason: string | null;
  /** Timestamp when the run was paused, null if not paused */
  pausedAt: string | null;
  createdAt: string;
  tokensUsed: number;
  /** Present only when the run is in the merge queue */
  mergeQueue?: {
    position: number;
    ahead: number;
    total: number;
  };
  /** Pre-filled CLI command to resume this run (present only when paused) */
  resumeCommand?: string;
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
  return new Response(formatJson(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
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

  // Look up spec title from specs table, falling back to specId
  const specTitle = resolveSpecTitle(db, specId);

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

  // For running/pending runs, elapsed ticks from now. For paused/completed/failed, freeze at updated_at.
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
    pauseReason: (r.pause_reason as string) ?? null,
    pausedAt: (r.paused_at as string) ?? null,
    createdAt: r.created_at as string,
    tokensUsed: r.tokens_used as number,
  };

  if (r.error) {
    summary.error = r.error as string;
  }

  // Add pause info if the run is paused
  if (r.status === "paused") {
    if (r.pause_reason) {
      summary.pauseReason = r.pause_reason as string;
    }
    if (r.paused_at) {
      summary.pausedAt = r.paused_at as string;
    }
    summary.resumeCommand = `dark continue ${runId} --budget-usd <amount>`;
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
  const runStatus = run.status as string;

  const phases = PHASE_ORDER.map((phaseId, idx) => {
    const isSkipped = shouldSkipPhase(phaseId, skipContext);

    let status: "completed" | "active" | "pending" | "skipped" | "paused";
    if (isSkipped) {
      status = "skipped";
    } else if (currentIdx >= 0 && idx < currentIdx) {
      status = "completed";
    } else if (currentIdx >= 0 && idx === currentIdx) {
      // If run is paused, show the current phase as paused instead of active
      status = runStatus === "paused" ? "paused" : "active";
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

// --- Spec API Helpers ---

/** Check if a spec is locked (has at least one completed run) */
function isSpecLocked(db: InstanceType<typeof Database>, specId: string): boolean {
  const completedRun = db
    .prepare("SELECT COUNT(*) as cnt FROM runs WHERE spec_id = ? AND status = 'completed'")
    .get(specId) as { cnt: number };
  return completedRun.cnt > 0;
}

/** Generate a title from a description string */
function titleFromDescription(description: string): string {
  const firstSentence = description.split(/[.!?\n]/)[0].trim();
  if (firstSentence.length <= 80) return firstSentence;
  return firstSentence.substring(0, 77) + "...";
}

/** Generate spec markdown content from a description */
function generateSpecContent(description: string): { title: string; content: string } {
  const title = titleFromDescription(description);
  const lines = description.split(/[.!?\n]/).map(s => s.trim()).filter(Boolean);
  const requirements = lines.length > 1
    ? lines.map(line => `- ${line}`).join("\n")
    : `- ${description.trim()}`;

  const body = `# ${title}

## Goal

${description.trim()}

## Requirements

${requirements}

## Scenarios

<!-- Scenarios will be filled by the architect -->
`;

  return { title, content: body };
}

// --- Contract: SpecListAPI ---

function handleListSpecs(db: InstanceType<typeof Database>): Response {
  const rows = db
    .prepare("SELECT * FROM specs ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  const specs = rows.map((s) => ({
    id: s.id as string,
    title: s.title as string,
    status: s.status as string,
    lastModified: s.updated_at as string,
    scenarioCount: s.scenario_count as number,
    createdAt: s.created_at as string,
  }));

  return jsonResponse(specs);
}

// --- Contract: SpecDetailAPI ---

function handleGetSpecDetail(db: InstanceType<typeof Database>, specId: string): Response {
  const spec = db.prepare("SELECT * FROM specs WHERE id = ?").get(specId) as Record<string, unknown> | null;
  if (!spec) {
    return errorResponse(`Spec not found: ${specId}`, 404);
  }

  const filePath = spec.file_path as string;
  const resolvedPath = resolve(filePath);
  if (!existsSync(resolvedPath)) {
    return errorResponse(`Spec file not found: ${filePath}`, 404);
  }

  const raw = readFileSync(resolvedPath, "utf-8");
  const { data: frontmatter, body } = parseFrontmatter<Record<string, unknown>>(raw);
  const locked = isSpecLocked(db, specId);

  return jsonResponse({
    id: specId,
    title: (frontmatter.title as string) ?? (spec.title as string),
    type: (frontmatter.type as string) ?? null,
    status: (frontmatter.status as string) ?? (spec.status as string),
    version: (frontmatter.version as string) ?? null,
    priority: (frontmatter.priority as string) ?? null,
    content: body.trim(),
    isLocked: locked,
  });
}

// --- Contract: SpecCreateAPI ---

async function handleCreateSpec(db: InstanceType<typeof Database>, req: Request, specsDirOverride?: string | null): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const description = body.description as string | undefined;
  if (!description || description.trim().length === 0) {
    return errorResponse("Missing or empty 'description' field", 400);
  }

  const specId = newSpecId();
  const { title, content } = generateSpecContent(description.trim());

  const frontmatterData = {
    id: specId,
    title,
    type: "feature",
    status: "draft",
    version: "0.1.0",
    priority: "medium",
  };

  const fullContent = serializeFrontmatter(frontmatterData, content);

  // Resolve specs directory
  let specsDir: string;
  if (specsDirOverride) {
    specsDir = specsDirOverride;
  } else {
    const dfDir = findDfDir();
    if (dfDir) {
      specsDir = join(dfDir, "specs");
    } else {
      specsDir = join(process.cwd(), ".df", "specs");
    }
  }

  if (!existsSync(specsDir)) {
    mkdirSync(specsDir, { recursive: true });
  }

  const filePath = join(specsDir, `${specId}.md`);
  writeFileSync(filePath, fullContent);

  // Register in database
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  db.prepare(
    `INSERT INTO specs (id, title, status, file_path, content_hash, scenario_count, created_at, updated_at)
     VALUES (?, ?, 'draft', ?, '', 0, ?, ?)`,
  ).run(specId, title, filePath, ts, ts);

  return jsonResponse(
    {
      id: specId,
      title,
      status: "draft",
      content: content.trim(),
      filePath,
    },
    201,
  );
}

// --- Contract: SpecUpdateAPI ---

async function handleUpdateSpec(db: InstanceType<typeof Database>, specId: string, req: Request): Promise<Response> {
  const spec = db.prepare("SELECT * FROM specs WHERE id = ?").get(specId) as Record<string, unknown> | null;
  if (!spec) {
    return errorResponse(`Spec not found: ${specId}`, 404);
  }

  if (isSpecLocked(db, specId)) {
    return errorResponse("This spec is locked — it has a completed build. Create a new spec to make changes.", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const content = body.content as string | undefined;
  if (content === undefined || content === null) {
    return errorResponse("Missing 'content' field", 400);
  }

  const filePath = spec.file_path as string;
  const resolvedPath = resolve(filePath);

  // Read existing frontmatter to preserve it
  let frontmatterData: Record<string, unknown> = {};
  if (existsSync(resolvedPath)) {
    const existing = readFileSync(resolvedPath, "utf-8");
    const { data } = parseFrontmatter<Record<string, unknown>>(existing);
    frontmatterData = data;
  }

  const fullContent = serializeFrontmatter(frontmatterData, content);
  writeFileSync(resolvedPath, fullContent);

  // Update database timestamp
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  db.prepare("UPDATE specs SET updated_at = ? WHERE id = ?").run(ts, specId);

  return jsonResponse({
    id: specId,
    title: (frontmatterData.title as string) ?? (spec.title as string),
    status: (frontmatterData.status as string) ?? (spec.status as string),
    content: content.trim(),
  });
}

// --- Contract: BuildCreateAPI ---

async function handleCreateBuild(db: InstanceType<typeof Database>, req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const specId = body.specId as string | undefined;
  if (!specId) {
    return errorResponse("Missing 'specId' field", 400);
  }

  const spec = db.prepare("SELECT * FROM specs WHERE id = ?").get(specId) as Record<string, unknown> | null;
  if (!spec) {
    return errorResponse(`Spec not found: ${specId}`, 404);
  }

  // Check for active builds
  const activeRun = db
    .prepare("SELECT id FROM runs WHERE spec_id = ? AND status IN ('pending', 'running')")
    .get(specId) as { id: string } | null;
  if (activeRun) {
    return errorResponse(`Spec already has an active build: ${activeRun.id}`, 409);
  }

  const runId = newRunId();
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, 'pending', 0, 4, 50.0, 3, '{}', ?, ?)`,
  ).run(runId, specId, ts, ts);

  return jsonResponse(
    {
      runId,
      specId,
      status: "pending",
    },
    201,
  );
}

// --- Contract: SpecRunsAPI ---

function handleGetSpecRuns(db: InstanceType<typeof Database>, specId: string): Response {
  const spec = db.prepare("SELECT * FROM specs WHERE id = ?").get(specId) as Record<string, unknown> | null;
  if (!spec) {
    return errorResponse(`Spec not found: ${specId}`, 404);
  }

  const rows = db
    .prepare("SELECT * FROM runs WHERE spec_id = ? ORDER BY created_at DESC")
    .all(specId) as Record<string, unknown>[];

  const runs = rows.map((r) => toRunSummary(db, r));
  return jsonResponse(runs);
}

// --- Blocker API handlers ---

function handleListBlockers(
  db: InstanceType<typeof Database>,
  runId: string,
  status?: BlockerStatus
): Response {
  const blockers = listBlockersByRun(db, runId, status);
  return jsonResponse(blockers);
}

async function handleResolveBlocker(
  db: InstanceType<typeof Database>,
  blockerId: string,
  req: Request
): Promise<Response> {
  const existing = getBlocker(db, blockerId);
  if (!existing) {
    return errorResponse(`Blocker not found: ${blockerId}`, 404);
  }

  const body = await req.json() as {
    value?: string;
    env_key?: string;
    env_value?: string;
  };

  let resolvedValue: string | undefined;

  if (existing.type === "secret" && body.env_key && body.env_value) {
    // Encrypt the secret value before storing
    const dfDir = findDfDir();
    if (dfDir) {
      const encKey = getEncryptionKey(dfDir);
      resolvedValue = encryptSecret(body.env_value, encKey);
    } else {
      // Fallback: store value as-is when no .df dir (e.g. tests)
      resolvedValue = body.env_value;
    }
  } else if (body.value !== undefined) {
    resolvedValue = body.value;
  }

  resolveBlocker(db, blockerId, resolvedValue ?? "", "dashboard");

  // Re-fetch the blocker to return the updated state
  const updated = getBlocker(db, blockerId);
  return jsonResponse({ success: true, blocker: updated });
}

// --- URL Router ---

async function route(
  db: InstanceType<typeof Database>,
  req: Request,
  getDashboardHtml: () => string,
  specsDir?: string | null,
  requestLogger?: RequestLogger | null,
): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;
  const startTime = performance.now();

  // CORS preflight (not logged)
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // --- GET /api/logs ---
  if (path === "/api/logs" && req.method === "GET") {
    const logs = requestLogger?.getRecent(100) ?? [];
    return jsonResponse(logs);
  }

  // Hello endpoint
  if (path === "/hello") {
    return jsonResponse({ message: "Hello, world!" });
  }

  // HTML root
  if (path === "/" || path === "") {
    return htmlResponse(getDashboardHtml());
  }

  // --- Spec API routes ---

  if (path === "/api/specs" && method === "POST") {
    return handleCreateSpec(db, req, specsDir);
  }

  if (path === "/api/specs" && method === "GET") {
    return handleListSpecs(db);
  }

  if (path === "/api/builds" && method === "POST") {
    return handleCreateBuild(db, req);
  }

  const specMatch = path.match(/^\/api\/specs\/([^/]+)$/);
  if (specMatch) {
    const specId = specMatch[1];
    if (method === "PUT") {
      return handleUpdateSpec(db, specId, req);
    }
    return handleGetSpecDetail(db, specId);
  }

  const specSubMatch = path.match(/^\/api\/specs\/([^/]+)\/([^/]+)$/);
  if (specSubMatch) {
    const [, specId, sub] = specSubMatch;
    switch (sub) {
      case "runs":
        return handleGetSpecRuns(db, specId);
      default:
        return errorResponse(`Unknown sub-resource: ${sub}`, 404);
    }
  }

  // --- Run API routes ---
  if (path === "/api/runs") {
    return handleListRuns(db);
  }

  // Match /api/runs/:id and /api/runs/:id/subroute
  const runMatch = path.match(/^\/api\/runs\/([^/]+)$/);
  if (runMatch) {
    return handleGetRun(db, runMatch[1]);
  }

  // --- Blocker API routes (must be before generic runSubMatch) ---

  const blockerResolveMatch = path.match(/^\/api\/runs\/([^/]+)\/blockers\/([^/]+)\/resolve$/);
  if (blockerResolveMatch && method === "POST") {
    const [, runId, blockerId] = blockerResolveMatch;
    return handleResolveBlocker(db, blockerId, req);
  }

  const blockerListMatch = path.match(/^\/api\/runs\/([^/]+)\/blockers$/);
  if (blockerListMatch) {
    const runId = blockerListMatch[1];
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as BlockerStatus | null;
    return handleListBlockers(db, runId, status ?? undefined);
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
  const specsDir = config.specsDir ?? null;

  // Rate limiter: 100 requests per 60 seconds per IP
  const rateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60_000 });

  // Request logger for GET /api/logs
  const requestLogger = new RequestLogger();

  const server = Bun.serve({
    port,
    async fetch(req: Request): Promise<Response> {
      const startTime = performance.now();
      const url = new URL(req.url);
      const path = url.pathname;
      const method = req.method;

      try {
        // Rate limiting runs BEFORE route handling
        const ip = RateLimiter.extractIp(req, this as unknown as { requestIP?: (req: Request) => { address: string } | null });
        if (!rateLimiter.isAllowed(ip)) {
          const response = jsonResponse({ error: "Too many requests" }, 429);
          const duration = Math.round(performance.now() - startTime);
          requestLogger.log({
            method,
            path,
            status: 429,
            duration,
            timestamp: new Date().toISOString(),
          });
          return response;
        }

        const response = await route(db, req, getDashboardHtml, specsDir, requestLogger);

        // Log the request after routing
        const duration = Math.round(performance.now() - startTime);
        requestLogger.log({
          method,
          path,
          status: response.status,
          duration,
          timestamp: new Date().toISOString(),
        });

        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const response = errorResponse(message, 500);
        const duration = Math.round(performance.now() - startTime);
        requestLogger.log({
          method,
          path,
          status: 500,
          duration,
          timestamp: new Date().toISOString(),
        });
        return response;
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
