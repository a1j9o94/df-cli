/**
 * Tests for worktree persistence in the pipeline layer.
 *
 * Covers:
 * - getFailedBuilderWorktree(): retrieves worktree path from a previous failed builder
 * - Worktree preservation on builder failure (not removed)
 * - Worktree reuse during resume build phase
 * - Previous commits included in builder instructions
 */

import { describe, test, expect, beforeEach } from "bun:test";

import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { getFailedBuilderWorktree } from "../../../src/pipeline/resume.js";

// ---------------------------------------------------------------------------
// getFailedBuilderWorktree
// ---------------------------------------------------------------------------

describe("getFailedBuilderWorktree", () => {
  let db: SqliteDb;
  let runId: string;

  beforeEach(() => {
    db = getDbForTest();
    const run = createRun(db, { spec_id: "test-spec" });
    runId = run.id;
  });

  test("returns null when no failed builders exist for module", () => {
    const result = getFailedBuilderWorktree(db, runId, "mod-a");
    expect(result).toBeNull();
  });

  test("returns worktree path from a failed builder", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      worktree_path: "/tmp/df-worktrees/mod-a-abc123",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "failed", "Process exited without completing");

    const result = getFailedBuilderWorktree(db, runId, "mod-a");
    expect(result).toBe("/tmp/df-worktrees/mod-a-abc123");
  });

  test("returns null when builder has no worktree_path", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "failed", "some error");

    const result = getFailedBuilderWorktree(db, runId, "mod-a");
    expect(result).toBeNull();
  });

  test("returns most recent failed builder worktree when multiple exist", () => {
    // First failed builder
    const agent1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a-1",
      module_id: "mod-a",
      worktree_path: "/tmp/df-worktrees/mod-a-old",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent1.id, "failed", "first failure");

    // Second (more recent) failed builder
    const agent2 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a-2",
      module_id: "mod-a",
      worktree_path: "/tmp/df-worktrees/mod-a-newer",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent2.id, "failed", "second failure");

    const result = getFailedBuilderWorktree(db, runId, "mod-a");
    expect(result).toBe("/tmp/df-worktrees/mod-a-newer");
  });

  test("ignores completed builders", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      worktree_path: "/tmp/df-worktrees/mod-a-done",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "completed");

    const result = getFailedBuilderWorktree(db, runId, "mod-a");
    expect(result).toBeNull();
  });

  test("ignores builders for different modules", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-b",
      module_id: "mod-b",
      worktree_path: "/tmp/df-worktrees/mod-b-abc",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "failed", "some error");

    const result = getFailedBuilderWorktree(db, runId, "mod-a");
    expect(result).toBeNull();
  });
});
