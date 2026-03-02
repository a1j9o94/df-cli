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
  estimateCostIfMissing,
  executeAgentPhase,
  setPollInterval,
  resetPollInterval,
} from "../../../src/pipeline/agent-lifecycle.js";

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
  setPollInterval(10);
});

afterEach(() => {
  resetPollInterval();
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

    // Should resolve without error
    await waitForAgent(db, runtime, agent.id);
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
      await waitForAgent(db, runtime, agent.id);
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
      await waitForAgent(db, runtime, agent.id);
      expect(true).toBe(false); // Should not reach
    } catch (err) {
      expect((err as Error).message).toContain("process exited without completing");
    }
  });
});

describe("estimateCostIfMissing", () => {
  test("is exported as a function", () => {
    expect(typeof estimateCostIfMissing).toBe("function");
  });

  test("does nothing if agent already has cost > 0", () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id, budget_usd: 50 });

    const agent = createAgent(db, {
      agent_id: "", run_id: run.id, role: "evaluator",
      name: "test-eval", system_prompt: "test",
    });

    // Manually set cost
    db.prepare("UPDATE agents SET cost_usd = 5.0 WHERE id = ?").run(agent.id);

    const agentRecord = db.prepare("SELECT * FROM agents WHERE id = ?").get(agent.id) as any;
    estimateCostIfMissing(db, agentRecord);

    const after = db.prepare("SELECT cost_usd FROM agents WHERE id = ?").get(agent.id) as { cost_usd: number };
    expect(after.cost_usd).toBe(5.0); // Unchanged
  });

  test("estimates cost based on elapsed time if cost is 0", () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id, budget_usd: 50 });

    const agent = createAgent(db, {
      agent_id: "", run_id: run.id, role: "evaluator",
      name: "test-eval", system_prompt: "test",
    });

    // Set updated_at to 5 minutes after created_at
    const created = new Date();
    const updated = new Date(created.getTime() + 5 * 60 * 1000);
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ?, cost_usd = 0 WHERE id = ?")
      .run(created.toISOString(), updated.toISOString(), agent.id);

    const agentRecord = db.prepare("SELECT * FROM agents WHERE id = ?").get(agent.id) as any;
    estimateCostIfMissing(db, agentRecord);

    // Check that cost was estimated (5 min * $0.05/min = ~$0.25)
    const after = db.prepare("SELECT cost_usd FROM runs WHERE id = ?").get(run.id) as { cost_usd: number };
    expect(after.cost_usd).toBeGreaterThan(0);
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
