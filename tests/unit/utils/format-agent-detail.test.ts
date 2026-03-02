import { describe, test, expect } from "bun:test";
import { formatAgentDetail } from "../../../src/utils/format-agent-detail.js";
import type { AgentRecord, EventRecord, MessageRecord } from "../../../src/types/index.js";

function makeAgent(overrides: Partial<AgentRecord> = {}): AgentRecord {
  return {
    id: "agt_01ABC",
    run_id: "run_01XYZ",
    role: "builder",
    name: "builder-foo",
    status: "running",
    pid: 12345,
    module_id: "foo",
    buildplan_id: "plan_01XYZ",
    worktree_path: "/var/folders/.../foo-mm8abc",
    branch_name: "df-build/run_01KJ/foo-mm8abc",
    session_id: null,
    system_prompt: "You are a builder.",
    tdd_phase: "green",
    tdd_cycles: 3,
    cost_usd: 0.62,
    tokens_used: 5000,
    queue_wait_ms: 1000,
    total_active_ms: 754000,
    last_heartbeat: new Date(Date.now() - 120000).toISOString(),
    error: null,
    created_at: new Date(Date.now() - 754000).toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "evt_01ABC",
    run_id: "run_01XYZ",
    agent_id: "agt_01ABC",
    type: "agent-spawned",
    data: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeMessage(overrides: Partial<MessageRecord> = {}): MessageRecord {
  return {
    id: "msg_01ABC",
    run_id: "run_01XYZ",
    from_agent_id: "agt_02DEF",
    to_agent_id: "agt_01ABC",
    to_role: null,
    to_contract_id: null,
    body: "Your contract is ready",
    read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("formatAgentDetail", () => {
  test("shows all core fields", () => {
    const output = formatAgentDetail({
      agent: makeAgent(),
      events: [],
      messages: [],
    });

    expect(output).toContain("Agent: agt_01ABC");
    expect(output).toContain("Name:          builder-foo");
    expect(output).toContain("Role:          builder");
    expect(output).toContain("Status:        running");
    expect(output).toContain("PID:           12345");
    expect(output).toContain("Module:        foo");
    expect(output).toContain("Worktree:      /var/folders/.../foo-mm8abc");
    expect(output).toContain("Cost:          $0.62");
    expect(output).toContain("Tokens:        5,000");
    expect(output).toContain("TDD Phase:     green");
    expect(output).toContain("TDD Cycles:    3");
  });

  test("shows error when present", () => {
    const output = formatAgentDetail({
      agent: makeAgent({ status: "failed", error: "Build failed: tests not passing" }),
      events: [],
      messages: [],
    });

    expect(output).toContain("Error:         Build failed: tests not passing");
  });

  test("shows events section", () => {
    const output = formatAgentDetail({
      agent: makeAgent(),
      events: [
        makeEvent({ type: "agent-heartbeat" }),
        makeEvent({ type: "agent-spawned" }),
      ],
      messages: [],
    });

    expect(output).toContain("Events (2):");
    expect(output).toContain("agent-heartbeat");
    expect(output).toContain("agent-spawned");
  });

  test("shows messages section", () => {
    const output = formatAgentDetail({
      agent: makeAgent(),
      events: [],
      messages: [
        makeMessage({ body: "Your contract is ready" }),
      ],
    });

    expect(output).toContain("Messages (1):");
    expect(output).toContain("Your contract is ready");
  });

  test("shows 'No events' when empty", () => {
    const output = formatAgentDetail({
      agent: makeAgent(),
      events: [],
      messages: [],
    });

    expect(output).toContain("No events");
  });

  test("shows last heartbeat relative time", () => {
    const output = formatAgentDetail({
      agent: makeAgent({ last_heartbeat: new Date(Date.now() - 120000).toISOString() }),
      events: [],
      messages: [],
    });

    expect(output).toContain("Heartbeat:     2m ago");
  });

  test("shows elapsed time for running agent", () => {
    const output = formatAgentDetail({
      agent: makeAgent({ created_at: new Date(Date.now() - 754000).toISOString() }),
      events: [],
      messages: [],
    });

    expect(output).toContain("Elapsed:       12m 34s");
  });
});
