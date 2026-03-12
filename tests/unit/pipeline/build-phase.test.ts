import { describe, test, expect, beforeEach } from "bun:test";

import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, getAgent, updateAgentStatus, updateAgentHeartbeat } from "../../../src/db/queries/agents.js";
import { createSpec } from "../../../src/db/queries/specs.js";
import { createBuildplan, updateBuildplanStatus } from "../../../src/db/queries/buildplans.js";
import { DEFAULT_CONFIG } from "../../../src/types/config.js";
import type { DfConfig } from "../../../src/types/config.js";
import type { AgentRuntime } from "../../../src/runtime/interface.js";
import type { AgentHandle, AgentSpawnConfig, Buildplan } from "../../../src/types/index.js";

import { executeBuildPhase, executeResumeBuildPhase, type BuildPhaseOptions } from "../../../src/pipeline/build-phase.js";
import { getResource } from "../../../src/db/queries/resources.js";

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

// ---------------------------------------------------------------------------
// Resource limit enforcement (Finding #3)
// ---------------------------------------------------------------------------

describe("resource limit enforcement", () => {
  test("initializes resource records during build", async () => {
    const planJson = makeBuildplanJson([{ id: "mod-a" }]);
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createMockRuntime(db);

    await executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS);

    const worktrees = getResource(db, "worktrees");
    const apiSlots = getResource(db, "api_slots");

    expect(worktrees).not.toBeNull();
    expect(worktrees!.capacity).toBe(config.resources.max_worktrees);
    expect(apiSlots).not.toBeNull();
    expect(apiSlots!.capacity).toBe(config.resources.max_api_slots);
  });

  test("releases all resources after successful build", async () => {
    const planJson = makeBuildplanJson([
      { id: "mod-a" },
      { id: "mod-b" },
    ]);
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createMockRuntime(db);

    await executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS);

    const apiSlots = getResource(db, "api_slots");
    expect(apiSlots!.in_use).toBe(0);
  });

  test("api_slots limit enforced: max_api_slots=1 serializes agents", async () => {
    config.resources.max_api_slots = 1;
    const planJson = makeBuildplanJson([
      { id: "mod-a" },
      { id: "mod-b" },
      { id: "mod-c" },
    ]);
    const { runId } = setupRun({ buildplan: planJson });

    // Track max concurrent spawned agents
    let maxConcurrent = 0;
    let currentConcurrent = 0;
    let pidCounter = 1000;
    const handles: AgentHandle[] = [];

    const runtime: AgentRuntime = {
      async spawn(spawnConfig: AgentSpawnConfig): Promise<AgentHandle> {
        currentConcurrent++;
        if (currentConcurrent > maxConcurrent) maxConcurrent = currentConcurrent;

        const pid = pidCounter++;
        const handle: AgentHandle = {
          id: spawnConfig.agent_id,
          pid,
          role: spawnConfig.role,
          kill: async () => {},
        };
        handles.push(handle);

        setTimeout(() => {
          currentConcurrent--;
          updateAgentStatus(db, spawnConfig.agent_id, "completed");
        }, 30);

        return handle;
      },
      async send() {},
      async kill() {},
      async status(agentId: string) {
        const agent = db.prepare("SELECT status FROM agents WHERE id = ?").get(agentId) as { status: string } | undefined;
        if (!agent) return "unknown" as const;
        return agent.status === "completed" || agent.status === "failed" ? "stopped" as const : "running" as const;
      },
      async listActive() {
        return handles.filter((h) => {
          const agent = db.prepare("SELECT status FROM agents WHERE id = ?").get(h.id) as { status: string } | undefined;
          return agent?.status === "running" || agent?.status === "pending" || agent?.status === "spawning";
        });
      },
    };

    await executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS);

    // With max_api_slots=1, at most 1 agent should run concurrently
    expect(maxConcurrent).toBe(1);

    // All 3 modules should still complete
    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder'"
    ).all(runId) as { status: string }[];
    expect(agents.length).toBe(3);
    expect(agents.every((a) => a.status === "completed")).toBe(true);

    // Resources should be fully released
    const apiSlots = getResource(db, "api_slots");
    expect(apiSlots!.in_use).toBe(0);
  }, 10_000);

  test("releases resources on builder failure", async () => {
    const planJson = makeBuildplanJson([{ id: "failing-mod" }]);
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createMockRuntime(db, { failModules: ["failing-mod"] });

    await expect(
      executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS)
    ).rejects.toThrow(/Builder failed/);

    const apiSlots = getResource(db, "api_slots");
    expect(apiSlots!.in_use).toBe(0);
  });

  test("single-builder path acquires and releases api_slots", async () => {
    const { runId } = setupRun(); // no buildplan
    const runtime = createMockRuntime(db);

    await executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS);

    const apiSlots = getResource(db, "api_slots");
    expect(apiSlots).not.toBeNull();
    expect(apiSlots!.in_use).toBe(0);
  });

  test("resume path initializes and releases resources", async () => {
    const planJson = makeBuildplanJson([
      { id: "mod-a" },
      { id: "mod-b" },
    ]);
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createMockRuntime(db);

    await executeResumeBuildPhase(db, runtime, config, runId, new Set(["mod-a"]), TEST_OPTIONS);

    const apiSlots = getResource(db, "api_slots");
    const worktrees = getResource(db, "worktrees");
    expect(apiSlots).not.toBeNull();
    expect(apiSlots!.in_use).toBe(0);
    expect(worktrees).not.toBeNull();
    expect(worktrees!.capacity).toBe(config.resources.max_worktrees);
  });
// Stale agent detection and killing
// ---------------------------------------------------------------------------

/**
 * Create a mock runtime where agents stay "running" forever (never auto-complete)
 * so we can simulate stale heartbeat detection.
 */
function createStaleRuntime(db: SqliteDb): AgentRuntime & { killCalls: string[] } {
  let pidCounter = 2000;
  const handles: AgentHandle[] = [];
  const killCalls: string[] = [];

  return {
    killCalls,
    async spawn(spawnConfig: AgentSpawnConfig): Promise<AgentHandle> {
      const pid = pidCounter++;
      const handle: AgentHandle = {
        id: spawnConfig.agent_id,
        pid,
        role: spawnConfig.role,
        kill: async () => {},
      };
      handles.push(handle);

      // Set a heartbeat in the past so the agent appears stale immediately.
      // heartbeat_timeout_ms is 90_000 by default; backdate by 100s.
      const pastDate = new Date(Date.now() - 100_000).toISOString().replace(/\.\d{3}Z$/, "Z");
      db.prepare("UPDATE agents SET last_heartbeat = ? WHERE id = ?").run(pastDate, spawnConfig.agent_id);

      return handle;
    },
    async send() {},
    async kill(agentId: string) {
      killCalls.push(agentId);
    },
    async status(): Promise<"running" | "stopped" | "unknown"> {
      // Agent process is still "running" — it's a zombie
      return "running";
    },
    async listActive(): Promise<AgentHandle[]> {
      return handles.filter((h) => {
        const agent = db.prepare("SELECT status FROM agents WHERE id = ?").get(h.id) as { status: string } | undefined;
        return agent?.status === "running" || agent?.status === "pending" || agent?.status === "spawning";
      });
    },
  };
}

describe("stale agent killing", () => {
  test("kills stale agent after max_strikes consecutive detections", async () => {
    const planJson = makeBuildplanJson([{ id: "zombie-mod" }]);
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createStaleRuntime(db);

    // Use 2 strikes so the test is fast
    const testConfig = {
      ...config,
      runtime: { ...config.runtime, stale_agent_max_strikes: 2 },
    };

    await expect(
      executeBuildPhase(db, runtime, testConfig, runId, TEST_OPTIONS)
    ).rejects.toThrow(/Builder killed for module "zombie-mod": agent stopped heartbeating/);

    // Verify runtime.kill() was called
    expect(runtime.killCalls.length).toBe(1);

    // Verify the agent was marked as failed in DB
    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder'"
    ).all(runId) as { id: string; status: string; error: string | null }[];

    expect(agents.length).toBe(1);
    expect(agents[0].status).toBe("failed");
    expect(agents[0].error).toBe("Killed: agent stopped heartbeating");
  });

  test("creates agent-failed event when killing stale agent", async () => {
    const planJson = makeBuildplanJson([{ id: "stale-mod" }]);
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createStaleRuntime(db);

    const testConfig = {
      ...config,
      runtime: { ...config.runtime, stale_agent_max_strikes: 1 },
    };

    await expect(
      executeBuildPhase(db, runtime, testConfig, runId, TEST_OPTIONS)
    ).rejects.toThrow(/agent stopped heartbeating/);

    const events = db.prepare(
      "SELECT * FROM events WHERE run_id = ? AND type = 'agent-failed'"
    ).all(runId) as { data: string }[];

    expect(events.length).toBe(1);
    const data = JSON.parse(events[0].data);
    expect(data.moduleId).toBe("stale-mod");
    expect(data.error).toBe("Killed: agent stopped heartbeating");
  });

  test("does not kill agent before max_strikes is reached", async () => {
    const planJson = makeBuildplanJson([{ id: "slow-mod" }]);
    const { runId } = setupRun({ buildplan: planJson });

    let pidCounter = 3000;
    const handles: AgentHandle[] = [];
    let pollCount = 0;

    // Agent becomes stale but "recovers" (completes) after 2 polls,
    // before reaching 3 strikes. The agent completes in the DB and
    // runtime still reports "running" until DB status is checked.
    const runtime: AgentRuntime = {
      async spawn(spawnConfig: AgentSpawnConfig): Promise<AgentHandle> {
        const pid = pidCounter++;
        const handle: AgentHandle = {
          id: spawnConfig.agent_id,
          pid,
          role: spawnConfig.role,
          kill: async () => {},
        };
        handles.push(handle);

        // Set a stale heartbeat
        const pastDate = new Date(Date.now() - 100_000).toISOString().replace(/\.\d{3}Z$/, "Z");
        db.prepare("UPDATE agents SET last_heartbeat = ? WHERE id = ?").run(pastDate, spawnConfig.agent_id);

        // Agent completes itself after 250ms (after 2 poll cycles at 100ms)
        setTimeout(() => {
          updateAgentStatus(db, spawnConfig.agent_id, "completed");
        }, 250);

        return handle;
      },
      async send() {},
      async kill() { throw new Error("Should not be called"); },
      async status(agentId: string): Promise<"running" | "stopped" | "unknown"> {
        const agent = db.prepare("SELECT status FROM agents WHERE id = ?").get(agentId) as { status: string } | undefined;
        if (agent?.status === "completed" || agent?.status === "failed") return "stopped";
        return "running";
      },
      async listActive(): Promise<AgentHandle[]> {
        return handles.filter((h) => {
          const agent = db.prepare("SELECT status FROM agents WHERE id = ?").get(h.id) as { status: string } | undefined;
          return agent?.status === "running" || agent?.status === "pending" || agent?.status === "spawning";
        });
      },
    };

    // max_strikes=5 (agent completes after ~2 polls, well before 5 strikes)
    const testConfig = {
      ...config,
      runtime: { ...config.runtime, stale_agent_max_strikes: 5 },
    };

    await executeBuildPhase(db, runtime, testConfig, runId, TEST_OPTIONS);

    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder'"
    ).all(runId) as { id: string; status: string }[];

    expect(agents[0].status).toBe("completed");
  });

  test("kills stale agent in resume build phase", async () => {
    const planJson = makeBuildplanJson([
      { id: "done-mod" },
      { id: "zombie-mod" },
    ]);
    const { runId } = setupRun({ buildplan: planJson });
    const runtime = createStaleRuntime(db);

    const testConfig = {
      ...config,
      runtime: { ...config.runtime, stale_agent_max_strikes: 1 },
    };

    // done-mod already completed, zombie-mod will become stale
    await expect(
      executeResumeBuildPhase(db, runtime, testConfig, runId, new Set(["done-mod"]), TEST_OPTIONS)
    ).rejects.toThrow(/Builder killed for module "zombie-mod": agent stopped heartbeating/);

    expect(runtime.killCalls.length).toBe(1);

    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder'"
    ).all(runId) as { id: string; status: string; error: string | null; module_id: string | null }[];

    expect(agents.length).toBe(1);
    expect(agents[0].module_id).toBe("zombie-mod");
    expect(agents[0].status).toBe("failed");
    expect(agents[0].error).toBe("Killed: agent stopped heartbeating");
  });
});
});
