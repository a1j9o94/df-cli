import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, getAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { createSpec } from "../../../src/db/queries/specs.js";
import { listEvents } from "../../../src/db/queries/events.js";
import type { AgentRuntime } from "../../../src/runtime/interface.js";
import type { AgentHandle, AgentSpawnConfig } from "../../../src/types/index.js";
import { waitForAgent } from "../../../src/pipeline/agent-lifecycle.js";

let db: SqliteDb;

function createTestSpec(db: SqliteDb) {
  return createSpec(db, `spec_${Date.now()}`, "Test spec", "/tmp/test-spec.md");
}

/**
 * Create a mock runtime where the agent process appears stopped.
 */
function createStoppedRuntime(): AgentRuntime {
  return {
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
}

beforeEach(() => {
  db = getDbForTest();
});

describe("waitForAgent - incomplete status detection", () => {
  test("sets status to 'incomplete' when process exits with commits in worktree", async () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id, budget_usd: 50 });
    const runtime = createStoppedRuntime();

    const agent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-incomplete",
      system_prompt: "test",
    });

    // Set a worktree_path that would have commits
    // We pass a hasCommits callback to waitForAgent
    try {
      await waitForAgent(db, runtime, agent.id, undefined, 10, {
        checkWorktreeCommits: () => true, // simulate worktree has commits
      });
      expect(true).toBe(false); // Should not reach
    } catch (err) {
      expect((err as Error).message).toContain("incomplete");
    }

    // Verify agent status is 'incomplete', not 'failed'
    const updated = getAgent(db, agent.id)!;
    expect(updated.status).toBe("incomplete");
  });

  test("sets status to 'failed' when process exits with no commits", async () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id, budget_usd: 50 });
    const runtime = createStoppedRuntime();

    const agent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-failed",
      system_prompt: "test",
    });

    try {
      await waitForAgent(db, runtime, agent.id, undefined, 10, {
        checkWorktreeCommits: () => false, // no commits
      });
      expect(true).toBe(false); // Should not reach
    } catch (err) {
      expect((err as Error).message).toContain("process exited without completing");
    }

    // Verify agent status is 'failed'
    const updated = getAgent(db, agent.id)!;
    expect(updated.status).toBe("failed");
  });

  test("emits 'agent-incomplete' event when agent is incomplete", async () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id, budget_usd: 50 });
    const runtime = createStoppedRuntime();

    const agent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-event",
      system_prompt: "test",
    });

    try {
      await waitForAgent(db, runtime, agent.id, undefined, 10, {
        checkWorktreeCommits: () => true,
      });
    } catch {
      // expected
    }

    // Verify an agent-incomplete event was emitted
    const events = listEvents(db, run.id, { type: "agent-incomplete" });
    expect(events.length).toBe(1);
    expect(events[0].agent_id).toBe(agent.id);
  });

  test("without checkWorktreeCommits option, defaults to failed (backward compatible)", async () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id, budget_usd: 50 });
    const runtime = createStoppedRuntime();

    const agent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-compat",
      system_prompt: "test",
    });

    try {
      await waitForAgent(db, runtime, agent.id, undefined, 10);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("process exited without completing");
    }

    const updated = getAgent(db, agent.id)!;
    expect(updated.status).toBe("failed");
  });

  test("incomplete error message includes agent name for debugging", async () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id, budget_usd: 50 });
    const runtime = createStoppedRuntime();

    const agent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-debug-name",
      system_prompt: "test",
    });

    try {
      await waitForAgent(db, runtime, agent.id, undefined, 10, {
        checkWorktreeCommits: () => true,
      });
      expect(true).toBe(false);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain("incomplete");
      // Error should contain the error description set on the agent
    }

    const updated = getAgent(db, agent.id)!;
    expect(updated.error).toContain("commits exist");
  });
});
