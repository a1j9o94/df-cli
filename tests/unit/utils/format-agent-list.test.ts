import { describe, test, expect } from "bun:test";
import { formatAgentListEntry } from "../../../src/utils/format-agent-list.js";
import type { AgentRecord } from "../../../src/types/agent.js";

function makeAgent(overrides: Partial<AgentRecord> = {}): AgentRecord {
  return {
    id: "agt_01ABC",
    run_id: "run_01XYZ",
    role: "builder",
    name: "builder-foo",
    status: "running",
    pid: 12345,
    module_id: "foo",
    buildplan_id: null,
    worktree_path: "/var/folders/.../foo-mm8abc",
    branch_name: null,
    system_prompt: null,
    tdd_phase: null,
    tdd_cycles: 0,
    cost_usd: 0.62,
    tokens_used: 5000,
    queue_wait_ms: 0,
    total_active_ms: 0,
    last_heartbeat: new Date(Date.now() - 120000).toISOString(), // 2m ago
    error: null,
    created_at: new Date(Date.now() - 754000).toISOString(), // ~12m 34s ago
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("formatAgentListEntry", () => {
  test("includes agent id, name, role, and status", () => {
    const agent = makeAgent();
    const output = formatAgentListEntry(agent);
    expect(output).toContain("agt_01ABC");
    expect(output).toContain("builder-foo");
    expect(output).toContain("builder");
  });

  test("includes elapsed time for running agent", () => {
    const agent = makeAgent({
      created_at: new Date(Date.now() - 754000).toISOString(),
    });
    const output = formatAgentListEntry(agent);
    expect(output).toContain("12m 34s");
  });

  test("includes estimated cost", () => {
    const agent = makeAgent();
    const output = formatAgentListEntry(agent);
    // Agent has cost_usd of 0.62
    expect(output).toContain("$0.62");
  });

  test("includes files changed count when provided", () => {
    const agent = makeAgent();
    const output = formatAgentListEntry(agent, { filesChanged: 3 });
    expect(output).toContain("3 files");
  });

  test("includes module_id when present", () => {
    const agent = makeAgent({ module_id: "foo" });
    const output = formatAgentListEntry(agent);
    expect(output).toContain("module=foo");
  });

  test("includes worktree path on second line", () => {
    const agent = makeAgent({ worktree_path: "/var/folders/.../foo-mm8abc" });
    const output = formatAgentListEntry(agent);
    expect(output).toContain("worktree: /var/folders/.../foo-mm8abc");
  });

  test("includes last heartbeat relative time on second line", () => {
    const agent = makeAgent({
      last_heartbeat: new Date(Date.now() - 120000).toISOString(),
    });
    const output = formatAgentListEntry(agent);
    expect(output).toContain("last heartbeat: 2m ago");
  });

  test("shows 'never' for null last_heartbeat", () => {
    const agent = makeAgent({ last_heartbeat: null });
    const output = formatAgentListEntry(agent);
    expect(output).toContain("last heartbeat: never");
  });

  test("omits worktree line when worktree_path is null", () => {
    const agent = makeAgent({ worktree_path: null });
    const output = formatAgentListEntry(agent);
    expect(output).not.toContain("worktree:");
  });

  test("uses total_active_ms for completed agents instead of elapsed", () => {
    const agent = makeAgent({
      status: "completed",
      total_active_ms: 300000, // 5 minutes
      created_at: new Date(Date.now() - 600000).toISOString(), // 10 min ago — but shouldn't be used
    });
    const output = formatAgentListEntry(agent);
    // Should show total_active_ms (5m 0s), not elapsed from created_at (10m)
    expect(output).toContain("5m 0s");
    expect(output).not.toContain("10m");
  });
});
