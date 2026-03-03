import { describe, test, expect, beforeEach } from "bun:test";

import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, getAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { createSpec } from "../../../src/db/queries/specs.js";
import { createBuildplan, updateBuildplanStatus } from "../../../src/db/queries/buildplans.js";
import { DEFAULT_CONFIG } from "../../../src/types/config.js";
import type { DfConfig } from "../../../src/types/config.js";
import type { AgentRuntime } from "../../../src/runtime/interface.js";
import type { AgentHandle, AgentSpawnConfig, Buildplan } from "../../../src/types/index.js";

import { executeBuildPhase, executeResumeBuildPhase, type BuildPhaseOptions } from "../../../src/pipeline/build-phase.js";

/** Use a short poll interval for tests to avoid timeouts. */
const TEST_OPTIONS: BuildPhaseOptions = { pollIntervalMs: 100 };

let db: SqliteDb;
let config: DfConfig;

/**
 * Create a mock agent runtime that auto-completes agents when spawned.
 */
function createMockRuntime(db: SqliteDb, opts?: { failModules?: string[] }): AgentRuntime {
  let pidCounter = 1000;
  const handles: AgentHandle[] = [];
  const failModules = new Set(opts?.failModules ?? []);

  return {
    async spawn(spawnConfig: AgentSpawnConfig): Promise<AgentHandle> {
      const pid = pidCounter++;
      const handle: AgentHandle = {
        id: spawnConfig.agent_id,
        pid,
        role: spawnConfig.role,
        kill: async () => {},
      };
      handles.push(handle);

      // Auto-complete or auto-fail the agent after a tiny delay
      const moduleId = spawnConfig.module_id;
      setTimeout(() => {
        if (moduleId && failModules.has(moduleId)) {
          updateAgentStatus(db, spawnConfig.agent_id, "failed", `Build failed for ${moduleId}`);
        } else {
          updateAgentStatus(db, spawnConfig.agent_id, "completed");
        }
      }, 20);

      return handle;
    },
    async send() {},
    async kill() {},
    async status(agentId: string): Promise<"running" | "stopped" | "unknown"> {
      const agent = db.prepare("SELECT status FROM agents WHERE id = ?").get(agentId) as { status: string } | undefined;
      if (!agent) return "unknown";
      return agent.status === "completed" || agent.status === "failed" ? "stopped" : "running";
    },
    async listActive(): Promise<AgentHandle[]> {
      return handles.filter((h) => {
        const agent = db.prepare("SELECT status FROM agents WHERE id = ?").get(h.id) as { status: string } | undefined;
        return agent?.status === "running" || agent?.status === "pending" || agent?.status === "spawning";
      });
    },
  };
}

/**
 * Create a minimal buildplan JSON with the given modules and dependencies.
 */
function makeBuildplanJson(modules: { id: string; title?: string }[], dependencies: { from: string; to: string }[] = []): string {
  const plan: Buildplan = {
    spec_id: "",
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title ?? m.id,
      description: `Module ${m.id}`,
      scope: { creates: [`src/${m.id}.ts`], modifies: [], test_files: [`tests/${m.id}.test.ts`] },
      estimated_complexity: "medium" as const,
      estimated_tokens: 5000,
      estimated_duration_min: 10,
    })),
    contracts: [],
    dependencies: dependencies.map((d) => ({ from: d.from, to: d.to, type: "completion" as const })),
    parallelism: {
      max_concurrent: 4,
      parallel_groups: [{ phase: 1, modules: modules.map((m) => m.id) }],
      critical_path: modules.map((m) => m.id),
      critical_path_estimated_min: 10,
    },
    integration_strategy: {
      checkpoints: [],
      final_integration: "Run all tests",
    },
    risks: [],
    total_estimated_tokens: 10000,
    total_estimated_cost_usd: 1.0,
    total_estimated_duration_min: 10,
  };
  return JSON.stringify(plan);
}

/**
 * Helper: create a spec + run + (optional) active buildplan.
 */
function setupRun(options?: { buildplan?: string }): { specId: string; runId: string } {
  const spec = createSpec(db, `spec-${Date.now()}`, "Test spec", "/tmp/test-spec.md");
  const run = createRun(db, {
    spec_id: spec.id,
    skip_change_eval: true,
    max_parallel: 4,
    budget_usd: 50,
    max_iterations: 3,
  });

  if (options?.buildplan) {
    // Buildplan requires an existing architect agent (FK constraint)
    const architectAgent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "architect",
      name: "architect-test",
      system_prompt: "test",
    });
    const bp = createBuildplan(db, run.id, spec.id, architectAgent.id, options.buildplan);
    updateBuildplanStatus(db, bp.id, "active");
  }

  return { specId: spec.id, runId: run.id };
}

beforeEach(() => {
  db = getDbForTest();
  config = { ...DEFAULT_CONFIG };
});

// ---------------------------------------------------------------------------
// executeBuildPhase
// ---------------------------------------------------------------------------

describe("executeBuildPhase", () => {
  test("spawns a single builder when no buildplan exists", async () => {
    const { runId } = setupRun();
    const runtime = createMockRuntime(db);

    await executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS);

    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder'"
    ).all(runId) as { id: string; status: string; module_id: string | null }[];

    expect(agents.length).toBe(1);
    expect(agents[0].status).toBe("completed");
  });

  test("spawns builders for each module in buildplan", async () => {
    const planJson = makeBuildplanJson([
      { id: "module-a" },
      { id: "module-b" },
    ]);
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createMockRuntime(db);

    await executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS);

    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder' ORDER BY created_at"
    ).all(runId) as { id: string; status: string; module_id: string | null }[];

    expect(agents.length).toBe(2);
    expect(agents.every((a) => a.status === "completed")).toBe(true);

    const moduleIds = agents.map((a) => a.module_id).sort();
    expect(moduleIds).toEqual(["module-a", "module-b"]);
  });

  test("respects dependency ordering (builds dependencies first)", async () => {
    // module-b depends on module-a (module-b has a dep edge from → to meaning it needs to)
    const planJson = makeBuildplanJson(
      [{ id: "module-a" }, { id: "module-b" }],
      [{ from: "module-b", to: "module-a" }],
    );
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createMockRuntime(db);

    await executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS);

    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder' ORDER BY created_at"
    ).all(runId) as { id: string; status: string; module_id: string | null; created_at: string }[];

    expect(agents.length).toBe(2);
    expect(agents.every((a) => a.status === "completed")).toBe(true);

    // module-a should have been created before module-b
    const aAgent = agents.find((a) => a.module_id === "module-a")!;
    const bAgent = agents.find((a) => a.module_id === "module-b")!;
    expect(aAgent.created_at <= bAgent.created_at).toBe(true);
  });

  test("creates builder-started events for each module", async () => {
    const planJson = makeBuildplanJson([{ id: "mod-x" }]);
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createMockRuntime(db);

    await executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS);

    const events = db.prepare(
      "SELECT * FROM events WHERE run_id = ? AND type = 'builder-started'"
    ).all(runId) as { data: string }[];

    expect(events.length).toBe(1);
    const data = JSON.parse(events[0].data);
    expect(data.moduleId).toBe("mod-x");
  });

  test("sends builder instructions via mail", async () => {
    const { runId } = setupRun();
    const runtime = createMockRuntime(db);

    await executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS);

    const messages = db.prepare(
      "SELECT * FROM messages WHERE run_id = ?"
    ).all(runId) as { body: string; from_agent_id: string }[];

    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages[0].body).toContain("# Builder Instructions");
    expect(messages[0].from_agent_id).toBe("orchestrator");
  });

  test("throws on builder failure", async () => {
    const planJson = makeBuildplanJson([{ id: "failing-mod" }]);
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createMockRuntime(db, { failModules: ["failing-mod"] });

    await expect(
      executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS)
    ).rejects.toThrow(/Builder failed for module "failing-mod"/);
  });
});

// ---------------------------------------------------------------------------
// executeResumeBuildPhase
// ---------------------------------------------------------------------------

describe("executeResumeBuildPhase", () => {
  test("spawns single builder when no buildplan (resume fallback)", async () => {
    const { runId } = setupRun();
    const runtime = createMockRuntime(db);

    await executeResumeBuildPhase(db, runtime, config, runId, new Set(), TEST_OPTIONS);

    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder'"
    ).all(runId) as { id: string; status: string }[];

    expect(agents.length).toBe(1);
    expect(agents[0].status).toBe("completed");
  });

  test("skips previously completed modules", async () => {
    const planJson = makeBuildplanJson([
      { id: "module-a" },
      { id: "module-b" },
      { id: "module-c" },
    ]);
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createMockRuntime(db);

    // module-a and module-b already completed
    const previouslyCompleted = new Set(["module-a", "module-b"]);

    await executeResumeBuildPhase(db, runtime, config, runId, previouslyCompleted, TEST_OPTIONS);

    // Only module-c should have been spawned
    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder'"
    ).all(runId) as { id: string; status: string; module_id: string | null }[];

    expect(agents.length).toBe(1);
    expect(agents[0].module_id).toBe("module-c");
    expect(agents[0].status).toBe("completed");
  });

  test("handles all modules already completed (no-op)", async () => {
    const planJson = makeBuildplanJson([
      { id: "module-a" },
      { id: "module-b" },
    ]);
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createMockRuntime(db);

    // All modules already completed
    const previouslyCompleted = new Set(["module-a", "module-b"]);

    await executeResumeBuildPhase(db, runtime, config, runId, previouslyCompleted, TEST_OPTIONS);

    // No builders should be spawned
    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder'"
    ).all(runId) as { id: string }[];

    expect(agents.length).toBe(0);
  });

  test("respects dependencies even in resume mode", async () => {
    // module-c depends on module-b, module-a already completed
    const planJson = makeBuildplanJson(
      [{ id: "module-a" }, { id: "module-b" }, { id: "module-c" }],
      [{ from: "module-c", to: "module-b" }],
    );
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createMockRuntime(db);

    const previouslyCompleted = new Set(["module-a"]);

    await executeResumeBuildPhase(db, runtime, config, runId, previouslyCompleted, TEST_OPTIONS);

    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder' ORDER BY created_at"
    ).all(runId) as { id: string; module_id: string | null; created_at: string }[];

    // Should build module-b first, then module-c
    expect(agents.length).toBe(2);
    const moduleIds = agents.map((a) => a.module_id);
    expect(moduleIds).toEqual(["module-b", "module-c"]);
  }, 15_000);
});
