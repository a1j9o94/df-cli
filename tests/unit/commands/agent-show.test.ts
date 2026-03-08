import { test, expect, describe, beforeEach } from "bun:test";
import { getDbForTest, type SqliteDb } from "../../../src/db/index.js";
import { getAgentDetail } from "../../../src/db/queries/agent-queries.js";
import { formatAgentDetail } from "../../../src/utils/format-agent-detail.js";
import { agentShowCommand } from "../../../src/commands/agent/show.js";
import { agentCommand } from "../../../src/commands/agent/index.js";

describe("dark agent show", () => {
  let db: SqliteDb;
  const runId = "run_01TEST";
  const agentId = "agt_01SHOW";

  beforeEach(() => {
    db = getDbForTest();

    // Create a run
    db.prepare(
      "INSERT INTO runs (id, spec_id, status, current_phase) VALUES (?, ?, ?, ?)"
    ).run(runId, "spec_01TEST", "running", "build");

    // Create an agent with data
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, worktree_path, branch_name, cost_usd, tokens_used, last_heartbeat, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      agentId, runId, "builder", "builder-parser", "running", 12345,
      "parser", "/tmp/worktree/parser", "df/parser-abc123",
      0.62, 15234, new Date(Date.now() - 120000).toISOString(),
      new Date(Date.now() - 740000).toISOString(),
      new Date().toISOString()
    );

    // Create events
    db.prepare(
      "INSERT INTO events (id, run_id, agent_id, type, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run("evt_01", runId, agentId, "agent-spawned", new Date(Date.now() - 740000).toISOString());
    db.prepare(
      "INSERT INTO events (id, run_id, agent_id, type, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run("evt_02", runId, agentId, "agent-heartbeat", new Date(Date.now() - 120000).toISOString());

    // Create a message to this agent
    db.prepare(
      "INSERT INTO messages (id, run_id, from_agent_id, to_agent_id, body, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("msg_01", runId, "agt_01ORCH", agentId, "Build the parser module following TDD", 0, new Date(Date.now() - 700000).toISOString());
  });

  test("getAgentDetail returns agent with events and messages", () => {
    const detail = getAgentDetail(db, agentId);
    expect(detail).not.toBeNull();
    expect(detail!.agent.id).toBe(agentId);
    expect(detail!.agent.role).toBe("builder");
    expect(detail!.agent.status).toBe("running");
    expect(detail!.agent.pid).toBe(12345);
    expect(detail!.agent.module_id).toBe("parser");
    expect(detail!.agent.worktree_path).toBe("/tmp/worktree/parser");
    expect(detail!.agent.branch_name).toBe("df/parser-abc123");
    expect(detail!.agent.cost_usd).toBe(0.62);
    expect(detail!.agent.tokens_used).toBe(15234);
    expect(detail!.events.length).toBe(2);
    expect(detail!.messages.length).toBe(1);
  });

  test("getAgentDetail returns null for non-existent agent", () => {
    const detail = getAgentDetail(db, "agt_NONEXISTENT");
    expect(detail).toBeNull();
  });

  test("formatAgentDetail shows all required fields", () => {
    const detail = getAgentDetail(db, agentId)!;
    const output = formatAgentDetail(detail);

    // All fields from the scenario must be present
    expect(output).toContain("Agent: agt_01SHOW");
    expect(output).toContain("Name:");
    expect(output).toContain("builder-parser");
    expect(output).toContain("Role:");
    expect(output).toContain("builder");
    expect(output).toContain("Status:");
    expect(output).toContain("running");
    expect(output).toContain("PID:");
    expect(output).toContain("12345");
    expect(output).toContain("Module:");
    expect(output).toContain("parser");
    expect(output).toContain("Worktree:");
    expect(output).toContain("/tmp/worktree/parser");
    expect(output).toContain("Branch:");
    expect(output).toContain("df/parser-abc123");
    expect(output).toContain("Elapsed:");
    expect(output).toContain("Cost:");
    expect(output).toContain("$0.62");
    expect(output).toContain("Tokens:");
    expect(output).toContain("15,234");
    expect(output).toContain("Heartbeat:");
  });

  test("formatAgentDetail shows events section", () => {
    const detail = getAgentDetail(db, agentId)!;
    const output = formatAgentDetail(detail);

    expect(output).toContain("Events (2):");
    expect(output).toContain("agent-spawned");
    expect(output).toContain("agent-heartbeat");
  });

  test("formatAgentDetail shows messages section", () => {
    const detail = getAgentDetail(db, agentId)!;
    const output = formatAgentDetail(detail);

    expect(output).toContain("Messages (1):");
    expect(output).toContain("from agt_01ORCH");
    expect(output).toContain("[unread]");
    expect(output).toContain("Build the parser module");
  });

  test("formatAgentDetail truncates long message bodies", () => {
    // Add a long message
    const longBody = "A".repeat(200);
    db.prepare(
      "INSERT INTO messages (id, run_id, from_agent_id, to_agent_id, body, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("msg_02", runId, "agt_01ORCH", agentId, longBody, 1, new Date().toISOString());

    const detail = getAgentDetail(db, agentId)!;
    const output = formatAgentDetail(detail);

    // Should contain truncated version (77 chars + ...)
    expect(output).toContain("...");
    expect(output).not.toContain(longBody);
  });

  test("formatAgentDetail shows error when agent has failed", () => {
    // Update agent to failed with error
    db.prepare("UPDATE agents SET status = 'failed', error = 'tests failed' WHERE id = ?").run(agentId);

    const detail = getAgentDetail(db, agentId)!;
    const output = formatAgentDetail(detail);

    expect(output).toContain("Error:");
    expect(output).toContain("tests failed");
  });

  test("agentShowCommand is registered as subcommand of agent", () => {
    const commands = agentCommand.commands.map(c => c.name());
    expect(commands).toContain("show");
  });

  test("agentShowCommand accepts --json flag", () => {
    const jsonOpt = agentShowCommand.options.find(o => o.long === "--json");
    expect(jsonOpt).toBeDefined();
  });

  test("agentShowCommand accepts --verbose flag", () => {
    const verboseOpt = agentShowCommand.options.find(o => o.long === "--verbose");
    expect(verboseOpt).toBeDefined();
  });

  test("agentShowCommand expects an agent-id argument", () => {
    const args = agentShowCommand.registeredArguments;
    expect(args.length).toBe(1);
    expect(args[0].name()).toBe("agent-id");
  });

  test("formatAgentDetail shows 'none' for null optional fields", () => {
    // Create agent with null optional fields
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run("agt_BARE", runId, "orchestrator", "orchestrator", "running", new Date().toISOString(), new Date().toISOString());

    const detail = getAgentDetail(db, "agt_BARE")!;
    const output = formatAgentDetail(detail);

    expect(output).toContain("PID:           none");
    expect(output).toContain("Module:        none");
    expect(output).toContain("Worktree:      none");
    expect(output).toContain("Branch:        none");
    expect(output).toContain("Heartbeat:     never");
  });
});
