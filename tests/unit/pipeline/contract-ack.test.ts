import { describe, test, expect, beforeEach } from "bun:test";

import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { createSpec } from "../../../src/db/queries/specs.js";
import { createBuildplan, updateBuildplanStatus } from "../../../src/db/queries/buildplans.js";
import { createContract, acknowledgeContract } from "../../../src/db/queries/contracts.js";
import { getUnacknowledgedBindings } from "../../../src/db/queries/contracts.js";
import { DEFAULT_CONFIG } from "../../../src/types/config.js";
import type { DfConfig } from "../../../src/types/config.js";
import type { AgentRuntime } from "../../../src/runtime/interface.js";
import type { AgentHandle, AgentSpawnConfig, Buildplan } from "../../../src/types/index.js";

import { executeBuildPhase, executeResumeBuildPhase, type BuildPhaseOptions } from "../../../src/pipeline/build-phase.js";

/** Short poll + short ack timeout for tests. */
const TEST_OPTIONS: BuildPhaseOptions = { pollIntervalMs: 50, contractAckTimeoutMs: 200 };

let db: SqliteDb;
let config: DfConfig;

/**
 * Mock runtime that auto-acknowledges contracts before completing.
 */
function createAckingRuntime(db: SqliteDb): AgentRuntime {
  let pidCounter = 2000;
  const handles: AgentHandle[] = [];

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

      // Simulate agent acknowledging contracts then completing
      setTimeout(() => {
        // Acknowledge all bindings for this agent
        const bindings = db.prepare(
          "SELECT contract_id FROM contract_bindings WHERE agent_id = ? AND acknowledged = 0"
        ).all(spawnConfig.agent_id) as { contract_id: string }[];
        for (const b of bindings) {
          acknowledgeContract(db, b.contract_id, spawnConfig.agent_id);
        }
        // Then complete
        updateAgentStatus(db, spawnConfig.agent_id, "completed");
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
 * Mock runtime that completes WITHOUT acknowledging contracts.
 */
function createNonAckingRuntime(db: SqliteDb): AgentRuntime {
  let pidCounter = 3000;
  const handles: AgentHandle[] = [];

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

      // Complete without acknowledging contracts
      setTimeout(() => {
        updateAgentStatus(db, spawnConfig.agent_id, "completed");
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
 * Mock runtime that stays running (never completes) — for timeout tests.
 */
function createStallRuntime(db: SqliteDb): AgentRuntime {
  let pidCounter = 4000;
  const handles: AgentHandle[] = [];

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
      // Agent never completes or acknowledges — just stays running
      return handle;
    },
    async send() {},
    async kill() {},
    async status(): Promise<"running" | "stopped" | "unknown"> {
      return "running";
    },
    async listActive(): Promise<AgentHandle[]> {
      return handles;
    },
  };
}

/**
 * Build a buildplan JSON that includes contracts bound to modules.
 */
function makeBuildplanWithContracts(
  modules: { id: string }[],
  contracts: { name: string; bound_modules: string[]; binding_roles: Record<string, "implementer" | "consumer"> }[],
  dependencies: { from: string; to: string }[] = [],
): string {
  const plan: Buildplan = {
    spec_id: "",
    modules: modules.map((m) => ({
      id: m.id,
      title: m.id,
      description: `Module ${m.id}`,
      scope: { creates: [`src/${m.id}.ts`], modifies: [], test_files: [`tests/${m.id}.test.ts`] },
      estimated_complexity: "medium" as const,
      estimated_tokens: 5000,
      estimated_duration_min: 10,
    })),
    contracts: contracts.map((c) => ({
      name: c.name,
      description: `Contract ${c.name}`,
      format: "typescript",
      content: `interface ${c.name} {}`,
      bound_modules: c.bound_modules,
      binding_roles: c.binding_roles,
    })),
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
 * Set up a run with a buildplan and pre-create contract records in the DB.
 */
function setupRunWithContracts(
  contractNames: string[],
  modules: { id: string }[],
  contracts: { name: string; bound_modules: string[]; binding_roles: Record<string, "implementer" | "consumer"> }[],
): { specId: string; runId: string; buildplanId: string } {
  const spec = createSpec(db, `spec-${Date.now()}`, "Test spec", "/tmp/test-spec.md");
  const planJson = makeBuildplanWithContracts(modules, contracts);
  const run = createRun(db, {
    spec_id: spec.id,
    skip_change_eval: true,
    max_parallel: 4,
    budget_usd: 50,
    max_iterations: 3,
  });

  const architectAgent = createAgent(db, {
    agent_id: "",
    run_id: run.id,
    role: "architect",
    name: "architect-test",
    system_prompt: "test",
  });
  const bp = createBuildplan(db, run.id, spec.id, architectAgent.id, planJson);
  updateBuildplanStatus(db, bp.id, "active");

  // Pre-create contract records in the DB (the build phase expects them to already exist)
  for (const name of contractNames) {
    createContract(db, run.id, bp.id, name, `Contract ${name}`, "typescript", `interface ${name} {}`);
  }

  return { specId: spec.id, runId: run.id, buildplanId: bp.id };
}

beforeEach(() => {
  db = getDbForTest();
  config = { ...DEFAULT_CONFIG };
});

// ---------------------------------------------------------------------------
// Contract acknowledgment enforcement
// ---------------------------------------------------------------------------

describe("contract acknowledgment enforcement", () => {
  test("succeeds when builder acknowledges contracts before completing", async () => {
    const { runId } = setupRunWithContracts(
      ["SharedAPI"],
      [{ id: "mod-a" }],
      [{ name: "SharedAPI", bound_modules: ["mod-a"], binding_roles: { "mod-a": "implementer" } }],
    );
    const runtime = createAckingRuntime(db);

    // Should not throw — agent acknowledges contracts before completing
    await executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS);

    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder'"
    ).all(runId) as { id: string; status: string }[];
    expect(agents.length).toBe(1);
    expect(agents[0].status).toBe("completed");
  });

  test("fails when builder completes without acknowledging contracts", async () => {
    const { runId } = setupRunWithContracts(
      ["SharedAPI"],
      [{ id: "mod-a" }],
      [{ name: "SharedAPI", bound_modules: ["mod-a"], binding_roles: { "mod-a": "implementer" } }],
    );
    const runtime = createNonAckingRuntime(db);

    await expect(
      executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS)
    ).rejects.toThrow(/completed without acknowledging contracts/);
  });

  test("fails on contract ack timeout when builder stalls", async () => {
    const { runId } = setupRunWithContracts(
      ["SharedAPI"],
      [{ id: "mod-a" }],
      [{ name: "SharedAPI", bound_modules: ["mod-a"], binding_roles: { "mod-a": "implementer" } }],
    );
    const runtime = createStallRuntime(db);

    await expect(
      executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS)
    ).rejects.toThrow(/Contract acknowledgment timeout/);

    // Verify the agent was marked as failed
    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder'"
    ).all(runId) as { id: string; status: string; error: string | null }[];
    expect(agents.length).toBe(1);
    expect(agents[0].status).toBe("failed");
    expect(agents[0].error).toContain("Contract acknowledgment timeout");
  });

  test("creates agent-failed event on ack timeout", async () => {
    const { runId } = setupRunWithContracts(
      ["SharedAPI"],
      [{ id: "mod-a" }],
      [{ name: "SharedAPI", bound_modules: ["mod-a"], binding_roles: { "mod-a": "implementer" } }],
    );
    const runtime = createStallRuntime(db);

    await expect(
      executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS)
    ).rejects.toThrow(/Contract acknowledgment timeout/);

    const events = db.prepare(
      "SELECT * FROM events WHERE run_id = ? AND type = 'agent-failed'"
    ).all(runId) as { data: string }[];
    expect(events.length).toBeGreaterThanOrEqual(1);
    const data = JSON.parse(events[0].data);
    expect(data.error).toContain("Contract acknowledgment timeout");
  });

  test("no contract check for modules with no contracts", async () => {
    // Module with no contracts should complete normally
    const spec = createSpec(db, `spec-${Date.now()}`, "Test spec", "/tmp/test-spec.md");
    const planJson = makeBuildplanWithContracts([{ id: "mod-a" }], []);
    const run = createRun(db, {
      spec_id: spec.id,
      skip_change_eval: true,
      max_parallel: 4,
      budget_usd: 50,
      max_iterations: 3,
    });
    const architectAgent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "architect",
      name: "architect-test",
      system_prompt: "test",
    });
    const bp = createBuildplan(db, run.id, spec.id, architectAgent.id, planJson);
    updateBuildplanStatus(db, bp.id, "active");

    // Use non-acking runtime — but since there are no contracts, it should still succeed
    const runtime = createNonAckingRuntime(db);
    await executeBuildPhase(db, runtime, config, run.id, TEST_OPTIONS);

    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder'"
    ).all(run.id) as { id: string; status: string }[];
    expect(agents.length).toBe(1);
    expect(agents[0].status).toBe("completed");
  });

  test("enforces ack in resume build phase too", async () => {
    const { runId } = setupRunWithContracts(
      ["SharedAPI"],
      [{ id: "mod-a" }, { id: "mod-b" }],
      [{ name: "SharedAPI", bound_modules: ["mod-b"], binding_roles: { "mod-b": "consumer" } }],
    );
    const runtime = createNonAckingRuntime(db);

    // mod-a already completed, mod-b has unacked contract
    await expect(
      executeResumeBuildPhase(db, runtime, config, runId, new Set(["mod-a"]), TEST_OPTIONS)
    ).rejects.toThrow(/completed without acknowledging contracts/);
  });

  test("resume build phase succeeds when contracts acknowledged", async () => {
    const { runId } = setupRunWithContracts(
      ["SharedAPI"],
      [{ id: "mod-a" }, { id: "mod-b" }],
      [{ name: "SharedAPI", bound_modules: ["mod-b"], binding_roles: { "mod-b": "consumer" } }],
    );
    const runtime = createAckingRuntime(db);

    await executeResumeBuildPhase(db, runtime, config, runId, new Set(["mod-a"]), TEST_OPTIONS);

    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder'"
    ).all(runId) as { id: string; status: string; module_id: string | null }[];
    expect(agents.length).toBe(1);
    expect(agents[0].module_id).toBe("mod-b");
    expect(agents[0].status).toBe("completed");
  });
});

// ---------------------------------------------------------------------------
// getUnacknowledgedBindings
// ---------------------------------------------------------------------------

describe("getUnacknowledgedBindings", () => {
  test("returns unacknowledged bindings for agent", () => {
    const spec = createSpec(db, "s1", "test", "/tmp/s");
    const run = createRun(db, { spec_id: spec.id });
    const agent = createAgent(db, {
      agent_id: "", run_id: run.id, role: "architect", name: "arch", system_prompt: "test",
    });
    const bp = createBuildplan(db, run.id, spec.id, agent.id, makeBuildplanWithContracts([], []));
    const builder = createAgent(db, {
      agent_id: "", run_id: run.id, role: "builder", name: "builder", system_prompt: "test",
    });

    const contract = createContract(db, run.id, bp.id, "C1", "d", "ts", "content");
    db.prepare(
      "INSERT INTO contract_bindings (id, contract_id, agent_id, module_id, role, acknowledged, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)"
    ).run("b1", contract.id, builder.id, "m1", "consumer", new Date().toISOString());

    const unacked = getUnacknowledgedBindings(db, builder.id);
    expect(unacked).toHaveLength(1);
    expect(unacked[0].acknowledged).toBe(false);

    // After acknowledging, should return empty
    acknowledgeContract(db, contract.id, builder.id);
    const unacked2 = getUnacknowledgedBindings(db, builder.id);
    expect(unacked2).toHaveLength(0);
  });
});
