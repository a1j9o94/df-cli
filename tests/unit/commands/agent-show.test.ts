import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createAgent, updateAgentPid, updateAgentHeartbeat } from "../../../src/db/queries/agents.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { getAgentDetail } from "../../../src/db/queries/agent-queries.js";
import { formatAgentDetail } from "../../../src/utils/format-agent-detail.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_1" }).id;
});

describe("agent show command", () => {
  test("getAgentDetail returns agent with events and messages", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-foo",
      module_id: "foo",
      worktree_path: "/tmp/foo",
      system_prompt: "Build foo",
    });
    updateAgentPid(db, agent.id, 1234);
    updateAgentHeartbeat(db, agent.id);

    // Add an event
    db.prepare(
      "INSERT INTO events (id, run_id, agent_id, type, data, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("evt_1", runId, agent.id, "agent-spawned", null, new Date().toISOString());

    // Add a message
    db.prepare(
      "INSERT INTO messages (id, run_id, from_agent_id, to_agent_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("msg_1", runId, "agt_orch", agent.id, "Build module foo", new Date().toISOString());

    const detail = getAgentDetail(db, agent.id);
    expect(detail).not.toBeNull();
    expect(detail!.agent.name).toBe("builder-foo");
    expect(detail!.events).toHaveLength(1);
    expect(detail!.events[0].type).toBe("agent-spawned");
    expect(detail!.messages).toHaveLength(1);
    expect(detail!.messages[0].body).toBe("Build module foo");
  });

  test("getAgentDetail returns null for non-existent agent", () => {
    const detail = getAgentDetail(db, "agt_nonexistent");
    expect(detail).toBeNull();
  });

  test("formatAgentDetail shows all core fields", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-foo",
      module_id: "foo",
      worktree_path: "/tmp/foo",
      system_prompt: "Build foo",
    });
    updateAgentPid(db, agent.id, 1234);

    const detail = getAgentDetail(db, agent.id)!;
    const output = formatAgentDetail(detail);

    expect(output).toContain(`Agent: ${agent.id}`);
    expect(output).toContain("Name:          builder-foo");
    expect(output).toContain("Role:          builder");
    expect(output).toContain("Module:        foo");
    expect(output).toContain("Worktree:      /tmp/foo");
    expect(output).toContain("PID:           1234");
  });

  test("formatAgentDetail shows error when agent failed", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-foo",
      system_prompt: "Build foo",
    });
    db.prepare("UPDATE agents SET status = 'failed', error = 'Tests not passing' WHERE id = ?").run(agent.id);

    const detail = getAgentDetail(db, agent.id)!;
    const output = formatAgentDetail(detail);

    expect(output).toContain("Error:         Tests not passing");
  });
});
