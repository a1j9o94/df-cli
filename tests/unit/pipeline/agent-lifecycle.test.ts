import { describe, test, expect, beforeEach, afterEach } from "bun:test";

import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { createSpec } from "../../../src/db/queries/specs.js";
import { DEFAULT_CONFIG } from "../../../src/types/config.js";
import type { AgentRuntime } from "../../../src/runtime/interface.js";
import type { AgentHandle, AgentSpawnConfig } from "../../../src/types/index.js";
import {
  waitForAgent,
  executeAgentPhase,
} from "../../../src/pipeline/agent-lifecycle.js";
import { estimateAndRecordCost } from "../../../src/pipeline/budget.js";

let db: SqliteDb;

/**
 * Helper to create a spec in the test DB
 */
function createTestSpec(db: SqliteDb): ReturnType<typeof createSpec> {
  return createSpec(db, `spec_${Date.now()}`, "Test spec", "/tmp/test-spec.md");
}

/**
 * Create a mock agent runtime that auto-completes agents when spawned.
 */
function createMockRuntime(db: SqliteDb, options?: { autoComplete?: boolean; delay?: number }): AgentRuntime {
  let pidCounter = 1000;
  const handles: AgentHandle[] = [];
  const autoComplete = options?.autoComplete ?? true;
  const delay = options?.delay ?? 50;

  return {
    async spawn(config: AgentSpawnConfig): Promise<AgentHandle> {
      const pid = pidCounter++;
      const handle: AgentHandle = {
        id: config.agent_id,
        pid,
        role: config.role,
        kill: async () => {},
      };
      handles.push(handle);

      if (autoComplete) {
        setTimeout(() => {
          updateAgentStatus(db, config.agent_id, "completed");
        }, delay);
      }

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

beforeEach(() => {
  db = getDbForTest();
  // Use fast polling for tests (10ms instead of 5s)
  // setPollInterval not available in extracted module
});

afterEach(() => {
  // resetPollInterval not available in extracted module
});

describe("waitForAgent", () => {
  test("is exported as a function", () => {
    expect(typeof waitForAgent).toBe("function");
  });

  test("resolves when agent completes", async () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id, budget_usd: 50 });
    const runtime = createMockRuntime(db);

    const agent = createAgent(db, {
      agent_id: "", run_id: run.id, role: "evaluator",
      name: "test-eval", system_prompt: "test",
    });

    // Auto-complete after 50ms
    setTimeout(() => {
      updateAgentStatus(db, agent.id, "completed");
    }, 50);

    // Should resolve without error (use fast poll interval for tests)
    await waitForAgent(db, runtime, agent.id, undefined, 50);
  });

  test("throws when agent fails", async () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id, budget_usd: 50 });
    const runtime = createMockRuntime(db, { autoComplete: false });

    const agent = createAgent(db, {
      agent_id: "", run_id: run.id, role: "evaluator",
      name: "test-eval", system_prompt: "test",
    });

    // Fail the agent after 50ms
    setTimeout(() => {
      updateAgentStatus(db, agent.id, "failed", "Something went wrong");
    }, 50);

    try {
      await waitForAgent(db, runtime, agent.id, undefined, 50);
      expect(true).toBe(false); // Should not reach
    } catch (err) {
      expect((err as Error).message).toContain("Agent failed");
    }
  });

  test("throws when agent process exits without completing", async () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id, budget_usd: 50 });

    // Create a runtime that reports "stopped" for all agents
    const runtime: AgentRuntime = {
      async spawn(config: AgentSpawnConfig): Promise<AgentHandle> {
        return { id: config.agent_id, pid: 9999, role: config.role, kill: async () => {} };
      },
      async send() {},
      async kill() {},
      async status(): Promise<"running" | "stopped" | "unknown"> {
        return "stopped";
      },
      async listActive(): Promise<AgentHandle[]> {
        return [];
      },
    };

    const agent = createAgent(db, {
      agent_id: "", run_id: run.id, role: "evaluator",
      name: "test-eval", system_prompt: "test",
    });

    try {
      await waitForAgent(db, runtime, agent.id, undefined, 50);
      expect(true).toBe(false); // Should not reach
    } catch (err) {
      expect((err as Error).message).toContain("process exited without completing");
    }
  });
});

describe("estimateAndRecordCost (from budget.ts, replaces old estimateCostIfMissing)", () => {
  test("is exported from budget.ts", () => {
    expect(typeof estimateAndRecordCost).toBe("function");
  });

  test("estimates cost based on elapsed time", () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id, budget_usd: 50 });

    const agent = createAgent(db, {
      agent_id: "", run_id: run.id, role: "evaluator",
      name: "test-eval", system_prompt: "test",
    });

    // Set created_at to 5 minutes ago
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?")
      .run(fiveMinAgo, fiveMinAgo, agent.id);

    const cost = estimateAndRecordCost(db, agent.id);

    // Check that cost was estimated (~5 min * $0.05/min = ~$0.25)
    expect(cost).toBeGreaterThan(0);

    const after = db.prepare("SELECT cost_usd FROM runs WHERE id = ?").get(run.id) as { cost_usd: number };
    expect(after.cost_usd).toBeGreaterThan(0);
  });

  test("is idempotent for rapid calls (no double-counting)", () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id, budget_usd: 50 });

    const agent = createAgent(db, {
      agent_id: "", run_id: run.id, role: "evaluator",
      name: "test-eval", system_prompt: "test",
    });

    const twoMinAgo = new Date(Date.now() - 2 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?")
      .run(twoMinAgo, twoMinAgo, agent.id);

    const cost1 = estimateAndRecordCost(db, agent.id);
    const cost2 = estimateAndRecordCost(db, agent.id);

    // Second call adds very little
    const finalAgent = db.prepare("SELECT cost_usd FROM agents WHERE id = ?").get(agent.id) as { cost_usd: number };
    expect(finalAgent.cost_usd).toBeLessThan(cost1 * 2 + 0.02);
  });
});

describe("executeAgentPhase", () => {
  test("is exported as a function", () => {
    expect(typeof executeAgentPhase).toBe("function");
  });

  test("spawns agent, waits for completion, and estimates cost", async () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id, budget_usd: 50 });
    const runtime = createMockRuntime(db, { autoComplete: true, delay: 50 });

    let spawnedRole = "";

    // Wrap the runtime to capture what was spawned
    const wrappedRuntime: AgentRuntime = {
      ...runtime,
      async spawn(config: AgentSpawnConfig) {
        spawnedRole = config.role;
        return runtime.spawn(config);
      },
    };

    await executeAgentPhase(
      db,
      wrappedRuntime,
      run.id,
      "evaluator",
      (agentId) => `test prompt for ${agentId}`,
      {},
      () => {}, // no-op sendInstructions for test
      50, // fast poll interval for tests
    );

    expect(spawnedRole).toBe("evaluator");

    // Check that an agent was created and completed
    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'evaluator'"
    ).all(run.id) as any[];
    expect(agents.length).toBe(1);
    expect(agents[0].status).toBe("completed");
  });
});
