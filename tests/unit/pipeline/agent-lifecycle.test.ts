import { describe, test, expect, beforeEach, mock } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, getAgent, updateAgentStatus, updateAgentPid } from "../../../src/db/queries/agents.js";
import type { SqliteDb } from "../../../src/db/index.js";
import type { AgentRuntime } from "../../../src/runtime/interface.js";
import type { AgentRecord } from "../../../src/types/agent.js";
import {
  waitForAgent,
  estimateCostIfMissing,
  executeAgentPhase,
} from "../../../src/pipeline/agent-lifecycle.js";

/** Use a tiny poll interval in tests to avoid timeouts */
const TEST_POLL_MS = 10;

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "s1", budget_usd: 50 }).id;
});

/**
 * Create a mock runtime where the status() call controls the agent lifecycle.
 * This simulates realistic behavior where the agent process updates DB status
 * and eventually exits.
 */
function createMockRuntime(opts: {
  onSpawn?: (agentId: string) => void;
  statusSequence?: Array<"running" | "stopped" | "unknown">;
  onStatusCheck?: (agentId: string, callCount: number) => "running" | "stopped" | "unknown";
}): AgentRuntime {
  let statusCallCount = 0;
  return {
    spawn: mock((config) => {
      opts.onSpawn?.(config.agent_id);
      return Promise.resolve({
        id: config.agent_id,
        pid: 999,
        role: config.role,
        kill: mock(() => Promise.resolve()),
      });
    }),
    send: mock(() => Promise.resolve()),
    kill: mock(() => Promise.resolve()),
    status: mock((agentId: string) => {
      statusCallCount++;
      if (opts.onStatusCheck) {
        return Promise.resolve(opts.onStatusCheck(agentId, statusCallCount));
      }
      const seq = opts.statusSequence ?? ["stopped"];
      const idx = Math.min(statusCallCount - 1, seq.length - 1);
      return Promise.resolve(seq[idx]);
    }),
    listActive: mock(() => Promise.resolve([])),
  };
}

// --- waitForAgent ---

describe("waitForAgent", () => {
  test("resolves when agent is completed after first poll", async () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });
    updateAgentStatus(db, agent.id, "completed");

    const mockRuntime = createMockRuntime({ statusSequence: ["stopped"] });

    // Should resolve without throwing
    await waitForAgent(db, mockRuntime, agent.id, 123, TEST_POLL_MS);
  });

  test("throws when agent has failed status", async () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });
    updateAgentStatus(db, agent.id, "failed", "something broke");

    const mockRuntime = createMockRuntime({ statusSequence: ["stopped"] });

    await expect(waitForAgent(db, mockRuntime, agent.id, 123, TEST_POLL_MS)).rejects.toThrow("Agent failed");
  });

  test("throws when process exits without completing", async () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });
    // Agent stays in 'running' status but runtime says stopped
    updateAgentStatus(db, agent.id, "running");

    const mockRuntime = createMockRuntime({ statusSequence: ["stopped"] });

    await expect(waitForAgent(db, mockRuntime, agent.id, 123, TEST_POLL_MS)).rejects.toThrow(
      "Agent process exited without completing"
    );

    // Should also mark agent as failed in DB
    const finalAgent = getAgent(db, agent.id);
    expect(finalAgent?.status).toBe("failed");
  });

  test("keeps polling while runtime says running", async () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });
    updateAgentStatus(db, agent.id, "running");

    let pollCount = 0;
    const mockRuntime = createMockRuntime({
      onStatusCheck: (agentId, callCount) => {
        pollCount = callCount;
        // After 3 polls, simulate agent completing
        if (callCount >= 3) {
          updateAgentStatus(db, agentId, "completed");
        }
        return "running";
      },
    });

    await waitForAgent(db, mockRuntime, agent.id, 123, TEST_POLL_MS);
    // Should have polled at least 3 times (completed on check after 3rd status call)
    expect(pollCount).toBeGreaterThanOrEqual(3);
  });
});

// --- estimateCostIfMissing ---

describe("estimateCostIfMissing", () => {
  test("does nothing when agent already has cost", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });
    // Manually set cost on agent
    db.prepare("UPDATE agents SET cost_usd = 5.0 WHERE id = ?").run(agent.id);

    const agentRecord = getAgent(db, agent.id)!;
    estimateCostIfMissing(db, agentRecord);

    // Cost should remain unchanged at 5.0
    const after = getAgent(db, agent.id)!;
    expect(after.cost_usd).toBe(5.0);
  });

  test("estimates cost based on elapsed time when cost is zero", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });

    // Set created_at 10 minutes ago, updated_at now
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const nowStr = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ?, cost_usd = 0 WHERE id = ?").run(
      tenMinAgo,
      nowStr,
      agent.id,
    );

    const agentRecord = getAgent(db, agent.id)!;
    estimateCostIfMissing(db, agentRecord);

    // Should estimate ~$0.50 (10 min * $0.05/min)
    const after = getAgent(db, agent.id)!;
    expect(after.cost_usd).toBeGreaterThan(0);
    expect(after.cost_usd).toBeCloseTo(0.5, 0); // roughly $0.50
  });

  test("estimates minimum cost of $0.01", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "p",
    });

    // Set very short elapsed time (essentially 0)
    const nowStr = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ?, cost_usd = 0 WHERE id = ?").run(
      nowStr,
      nowStr,
      agent.id,
    );

    const agentRecord = getAgent(db, agent.id)!;
    estimateCostIfMissing(db, agentRecord);

    const after = getAgent(db, agent.id)!;
    expect(after.cost_usd).toBeGreaterThanOrEqual(0.01);
  });
});

// --- executeAgentPhase ---

describe("executeAgentPhase", () => {
  test("creates agent, sends instructions, spawns, and waits", async () => {
    let spawnedConfig: any = null;
    let sentMessage = false;

    // The key timing issue: updateAgentPid (called after spawn) sets status='running'.
    // So we use the status check to simulate the agent completing after spawning.
    const mockRuntime = createMockRuntime({
      onSpawn: (agentId) => {
        spawnedConfig = { agent_id: agentId, role: "architect" };
      },
      onStatusCheck: (agentId, callCount) => {
        // On first status check, mark the agent as completed (simulating agent finishing)
        updateAgentStatus(db, agentId, "completed");
        return "stopped";
      },
    });
    // Override spawn to capture full config
    (mockRuntime as any).spawn = mock((config: any) => {
      spawnedConfig = config;
      return Promise.resolve({
        id: config.agent_id,
        pid: 999,
        role: config.role,
        kill: mock(() => Promise.resolve()),
      });
    });

    const sendInstructions = mock((
      _db: SqliteDb,
      _runId: string,
      _agentId: string,
      _role: string,
      _context: Record<string, unknown>,
    ) => {
      sentMessage = true;
    });

    await executeAgentPhase(
      db,
      mockRuntime,
      runId,
      "architect",
      (agentId) => `prompt for ${agentId}`,
      {},
      sendInstructions,
      TEST_POLL_MS,
    );

    // Verify the agent was spawned
    expect(spawnedConfig).not.toBeNull();
    expect(spawnedConfig.role).toBe("architect");

    // Verify instructions were sent
    expect(sentMessage).toBe(true);
  });

  test("records estimated cost if agent didn't self-report", async () => {
    const mockRuntime = createMockRuntime({
      onStatusCheck: (agentId) => {
        // Mark completed on first status check
        updateAgentStatus(db, agentId, "completed");
        return "stopped";
      },
    });

    const sendInstructions = mock(() => {});

    await executeAgentPhase(
      db,
      mockRuntime,
      runId,
      "evaluator",
      (agentId) => `prompt for ${agentId}`,
      {},
      sendInstructions,
      TEST_POLL_MS,
    );

    // Find the agent that was created
    const agents = db.prepare("SELECT * FROM agents WHERE run_id = ? AND role = 'evaluator'").all(runId) as AgentRecord[];
    expect(agents.length).toBe(1);
    // Cost should have been estimated (at minimum $0.01)
    expect(agents[0].cost_usd).toBeGreaterThanOrEqual(0.01);
  });

  test("throws when spawned agent fails", async () => {
    const mockRuntime = createMockRuntime({
      onStatusCheck: (agentId) => {
        // Mark agent as failed on first status check
        updateAgentStatus(db, agentId, "failed", "build error");
        return "stopped";
      },
    });

    const sendInstructions = mock(() => {});

    await expect(
      executeAgentPhase(
        db,
        mockRuntime,
        runId,
        "merger",
        (agentId) => `prompt for ${agentId}`,
        {},
        sendInstructions,
        TEST_POLL_MS,
      )
    ).rejects.toThrow("Agent failed");
  });

  test("creates event for agent-spawned", async () => {
    const mockRuntime = createMockRuntime({
      onStatusCheck: (agentId) => {
        updateAgentStatus(db, agentId, "completed");
        return "stopped";
      },
    });

    const sendInstructions = mock(() => {});

    await executeAgentPhase(
      db,
      mockRuntime,
      runId,
      "integration-tester",
      (agentId) => `prompt for ${agentId}`,
      {},
      sendInstructions,
      TEST_POLL_MS,
    );

    // Check that an agent-spawned event was created
    const events = db.prepare(
      "SELECT * FROM events WHERE run_id = ? AND type = 'agent-spawned'"
    ).all(runId) as any[];
    expect(events.length).toBe(1);
    expect(JSON.parse(events[0].data).role).toBe("integration-tester");
  });

  test("updates system prompt and PID on agent record", async () => {
    let capturedAgentId = "";

    const rt = createMockRuntime({
      onSpawn: (agentId) => { capturedAgentId = agentId; },
      onStatusCheck: (agentId) => {
        updateAgentStatus(db, agentId, "completed");
        return "stopped";
      },
    });
    // Override spawn to use pid 42
    (rt as any).spawn = mock((config: any) => {
      capturedAgentId = config.agent_id;
      return Promise.resolve({
        id: config.agent_id,
        pid: 42,
        role: config.role,
        kill: mock(() => Promise.resolve()),
      });
    });

    const sendInstructions = mock(() => {});

    await executeAgentPhase(
      db,
      rt,
      runId,
      "architect",
      (agentId) => `custom-prompt-${agentId}`,
      {},
      sendInstructions,
      TEST_POLL_MS,
    );

    const agent = getAgent(db, capturedAgentId)!;
    expect(agent.system_prompt).toBe(`custom-prompt-${capturedAgentId}`);
    expect(agent.pid).toBe(42);
  });
});
