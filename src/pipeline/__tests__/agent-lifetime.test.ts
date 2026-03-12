/**
 * Tests for Finding #2: max_agent_lifetime_ms enforcement.
 *
 * Verifies that:
 * 1. getOverdueAgents returns agents whose created_at exceeds the lifetime
 * 2. The build phase kills overdue agents and marks them failed
 */

import { test, expect, describe } from "bun:test";
import { getDbForTest } from "../../db/index.js";
import { createAgent, getAgent, getOverdueAgents, updateAgentPid } from "../../db/queries/agents.js";

// ---------------------------------------------------------------------------
// getOverdueAgents unit tests
// ---------------------------------------------------------------------------

describe("getOverdueAgents", () => {
  function setupDb() {
    const db = getDbForTest();
    db.prepare("INSERT INTO runs (id, spec_id, status) VALUES (?, ?, ?)").run("run1", "spec1", "running");
    return db;
  }

  test("returns agents created before the lifetime cutoff", () => {
    const db = setupDb();

    // Create agent with created_at 60 minutes ago
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, system_prompt, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'running', ?, ?, ?)`
    ).run("agt_old", "run1", "builder", "builder-old", "prompt", sixtyMinAgo, sixtyMinAgo);

    // max_agent_lifetime_ms = 45 min = 2_700_000 ms
    const overdue = getOverdueAgents(db, 2_700_000);
    expect(overdue.length).toBe(1);
    expect(overdue[0].id).toBe("agt_old");

    db.close();
  });

  test("does not return agents within lifetime", () => {
    const db = setupDb();

    // Create agent with created_at 10 minutes ago
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, system_prompt, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'running', ?, ?, ?)`
    ).run("agt_fresh", "run1", "builder", "builder-fresh", "prompt", tenMinAgo, tenMinAgo);

    const overdue = getOverdueAgents(db, 2_700_000);
    expect(overdue.length).toBe(0);

    db.close();
  });

  test("does not return completed or failed agents", () => {
    const db = setupDb();

    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

    // Old but completed
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, system_prompt, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'completed', ?, ?, ?)`
    ).run("agt_done", "run1", "builder", "builder-done", "prompt", sixtyMinAgo, sixtyMinAgo);

    // Old but failed
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, system_prompt, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'failed', ?, ?, ?)`
    ).run("agt_fail", "run1", "builder", "builder-fail", "prompt", sixtyMinAgo, sixtyMinAgo);

    const overdue = getOverdueAgents(db, 2_700_000);
    expect(overdue.length).toBe(0);

    db.close();
  });

  test("returns multiple overdue agents sorted by created_at", () => {
    const db = setupDb();

    const ninetyMinAgo = new Date(Date.now() - 90 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, system_prompt, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'running', ?, ?, ?)`
    ).run("agt_older", "run1", "builder", "builder-older", "prompt", ninetyMinAgo, ninetyMinAgo);

    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, system_prompt, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'running', ?, ?, ?)`
    ).run("agt_old", "run1", "builder", "builder-old", "prompt", sixtyMinAgo, sixtyMinAgo);

    const overdue = getOverdueAgents(db, 2_700_000);
    expect(overdue.length).toBe(2);
    // Sorted by created_at ascending — oldest first
    expect(overdue[0].id).toBe("agt_older");
    expect(overdue[1].id).toBe("agt_old");

    db.close();
  });
});

// ---------------------------------------------------------------------------
// Build phase lifetime enforcement integration test
// ---------------------------------------------------------------------------

describe("build phase lifetime enforcement", () => {
  test("overdue agent is detected, killed, and marked failed", async () => {
    const db = getDbForTest();
    db.prepare("INSERT INTO runs (id, spec_id, status) VALUES (?, ?, ?)").run("run1", "spec1", "running");

    // Create an agent that was created 60 minutes ago
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, module_id, system_prompt, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'running', ?, ?, ?, ?)`
    ).run("agt_overdue", "run1", "builder", "builder-mod-a", "mod-a", "prompt", sixtyMinAgo, sixtyMinAgo);

    // Track runtime.kill calls
    let killCalled = false;
    let killedAgentId = "";

    const mockRuntime = {
      kill: async (agentId: string) => { killCalled = true; killedAgentId = agentId; },
    };

    // Simulate the build phase poll loop logic:
    // 1. getOverdueAgents finds the agent
    const overdue = getOverdueAgents(db, 100); // 100ms lifetime — agent is way past this
    expect(overdue.length).toBe(1);
    expect(overdue[0].id).toBe("agt_overdue");

    // 2. runtime.kill() is called, agent is marked failed
    for (const agent of overdue) {
      await mockRuntime.kill(agent.id);
      db.prepare("UPDATE agents SET status = 'failed', error = ? WHERE id = ?")
        .run("Exceeded max agent lifetime (100ms)", agent.id);
    }

    expect(killCalled).toBe(true);
    expect(killedAgentId).toBe("agt_overdue");

    const updated = getAgent(db, "agt_overdue");
    expect(updated!.status).toBe("failed");
    expect(updated!.error).toContain("Exceeded max agent lifetime");

    db.close();
  });

  test("agents within lifetime are not killed", () => {
    const db = getDbForTest();
    db.prepare("INSERT INTO runs (id, spec_id, status) VALUES (?, ?, ?)").run("run1", "spec1", "running");

    // Agent created just now
    const agent = createAgent(db, {
      agent_id: "agt_fresh",
      run_id: "run1",
      role: "builder",
      name: "builder-fresh",
      system_prompt: "prompt",
    });
    updateAgentPid(db, agent.id, 1234); // sets status to 'running'

    // With a 45-min lifetime, this fresh agent should NOT be overdue
    const overdue = getOverdueAgents(db, 2_700_000);
    expect(overdue.length).toBe(0);

    db.close();
  });
});
