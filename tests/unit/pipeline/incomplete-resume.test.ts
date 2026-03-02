import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { createSpec } from "../../../src/db/queries/specs.js";
import {
  getFailedBuilderWorktree,
  getIncompleteBuilderWorktree,
  getRetryableBuilderWorktree,
} from "../../../src/pipeline/resume.js";

let db: SqliteDb;

function createTestSpec(db: SqliteDb) {
  return createSpec(db, `spec_${Date.now()}`, "Test spec", "/tmp/test-spec.md");
}

beforeEach(() => {
  db = getDbForTest();
});

describe("getIncompleteBuilderWorktree", () => {
  test("returns worktree_path for incomplete builder agents", () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id });

    const agent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-incomplete",
      system_prompt: "test",
      worktree_path: "/tmp/worktree/incomplete-mod",
      module_id: "mod-a",
    });

    updateAgentStatus(db, agent.id, "incomplete");

    const result = getIncompleteBuilderWorktree(db, run.id, "mod-a");
    expect(result).toBe("/tmp/worktree/incomplete-mod");
  });

  test("returns null when no incomplete builder exists for module", () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id });

    const result = getIncompleteBuilderWorktree(db, run.id, "mod-nonexistent");
    expect(result).toBeNull();
  });

  test("returns most recent incomplete builder worktree", () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id });

    // Create two incomplete agents for same module
    const agent1 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-incomplete-1",
      system_prompt: "test",
      worktree_path: "/tmp/worktree/first-attempt",
      module_id: "mod-b",
    });
    updateAgentStatus(db, agent1.id, "incomplete");

    const agent2 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-incomplete-2",
      system_prompt: "test",
      worktree_path: "/tmp/worktree/second-attempt",
      module_id: "mod-b",
    });
    updateAgentStatus(db, agent2.id, "incomplete");

    const result = getIncompleteBuilderWorktree(db, run.id, "mod-b");
    expect(result).toBe("/tmp/worktree/second-attempt");
  });
});

describe("getRetryableBuilderWorktree", () => {
  test("returns worktree from incomplete agent (preferred over failed)", () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id });

    // Create a failed agent first
    const failed = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-failed",
      system_prompt: "test",
      worktree_path: "/tmp/worktree/failed",
      module_id: "mod-c",
    });
    updateAgentStatus(db, failed.id, "failed");

    // Create an incomplete agent (has commits, more recent)
    const incomplete = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-incomplete",
      system_prompt: "test",
      worktree_path: "/tmp/worktree/incomplete",
      module_id: "mod-c",
    });
    updateAgentStatus(db, incomplete.id, "incomplete");

    // getRetryableBuilderWorktree should prefer incomplete (has work)
    const result = getRetryableBuilderWorktree(db, run.id, "mod-c");
    expect(result).toBe("/tmp/worktree/incomplete");
  });

  test("falls back to failed agent worktree if no incomplete exists", () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id });

    const failed = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-failed",
      system_prompt: "test",
      worktree_path: "/tmp/worktree/failed-only",
      module_id: "mod-d",
    });
    updateAgentStatus(db, failed.id, "failed");

    const result = getRetryableBuilderWorktree(db, run.id, "mod-d");
    expect(result).toBe("/tmp/worktree/failed-only");
  });

  test("returns null when no failed or incomplete agents exist", () => {
    const spec = createTestSpec(db);
    const run = createRun(db, { spec_id: spec.id });

    const result = getRetryableBuilderWorktree(db, run.id, "mod-e");
    expect(result).toBeNull();
  });
});
