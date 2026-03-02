import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, getAgent, updateAgentBranchName } from "../../../src/db/queries/agents.js";
import { listEvents } from "../../../src/db/queries/events.js";
import type { SqliteDb } from "../../../src/db/index.js";
import {
  promoteBranch,
  parseStagingBranch,
  toReadyBranch,
  isStagingBranch,
  isReadyBranch,
} from "../../../src/pipeline/complete-promotion.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_test" }).id;
});

describe("branch naming helpers", () => {
  test("isStagingBranch returns true for df-staging/ branches", () => {
    expect(isStagingBranch("df-staging/run_01KJ/module-abc123")).toBe(true);
  });

  test("isStagingBranch returns false for df-ready/ branches", () => {
    expect(isStagingBranch("df-ready/run_01KJ/module-abc123")).toBe(false);
  });

  test("isStagingBranch returns false for other branches", () => {
    expect(isStagingBranch("main")).toBe(false);
    expect(isStagingBranch("feature/something")).toBe(false);
    expect(isStagingBranch("df-build/run_01KJ/module-abc123")).toBe(false);
  });

  test("isReadyBranch returns true for df-ready/ branches", () => {
    expect(isReadyBranch("df-ready/run_01KJ/module-abc123")).toBe(true);
  });

  test("isReadyBranch returns false for df-staging/ branches", () => {
    expect(isReadyBranch("df-staging/run_01KJ/module-abc123")).toBe(false);
  });

  test("toReadyBranch converts staging to ready", () => {
    expect(toReadyBranch("df-staging/run_01KJ/module-abc123")).toBe(
      "df-ready/run_01KJ/module-abc123",
    );
  });

  test("toReadyBranch throws for non-staging branch", () => {
    expect(() => toReadyBranch("main")).toThrow();
    expect(() => toReadyBranch("df-ready/run_01KJ/module-abc123")).toThrow();
  });

  test("parseStagingBranch extracts parts from staging branch name", () => {
    const parts = parseStagingBranch("df-staging/run_01KJ/module-abc123");
    expect(parts).toEqual({
      prefix: "df-staging",
      runShort: "run_01KJ",
      moduleSlug: "module-abc123",
    });
  });

  test("parseStagingBranch returns null for non-staging branch", () => {
    expect(parseStagingBranch("main")).toBeNull();
    expect(parseStagingBranch("df-ready/run_01KJ/module-abc123")).toBeNull();
  });
});

describe("promoteBranch", () => {
  test("promotes staging branch to ready in DB and emits event", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-promote",
      system_prompt: "prompt",
    });

    updateAgentBranchName(db, agent.id, "df-staging/run_01KJ/module-abc123");

    // Use skipGitRename option since we have no real git worktree in tests
    const result = promoteBranch(db, agent.id, { skipGitRename: true });

    expect(result.success).toBe(true);
    expect(result.oldBranch).toBe("df-staging/run_01KJ/module-abc123");
    expect(result.newBranch).toBe("df-ready/run_01KJ/module-abc123");

    // Check DB was updated
    const updated = getAgent(db, agent.id)!;
    expect(updated.branch_name).toBe("df-ready/run_01KJ/module-abc123");

    // Check event was emitted
    const events = listEvents(db, runId, { type: "agent-branch-promoted" });
    expect(events).toHaveLength(1);

    const eventData = JSON.parse(events[0].data!);
    expect(eventData.oldBranch).toBe("df-staging/run_01KJ/module-abc123");
    expect(eventData.newBranch).toBe("df-ready/run_01KJ/module-abc123");
    expect(events[0].agent_id).toBe(agent.id);
  });

  test("fails if agent has no branch_name", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-no-branch",
      system_prompt: "prompt",
    });

    const result = promoteBranch(db, agent.id, { skipGitRename: true });
    expect(result.success).toBe(false);
    expect(result.error).toContain("no branch_name");
  });

  test("fails if branch is not a staging branch", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-not-staging",
      system_prompt: "prompt",
    });

    updateAgentBranchName(db, agent.id, "df-ready/run_01KJ/module-abc123");

    const result = promoteBranch(db, agent.id, { skipGitRename: true });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not a staging branch");
  });

  test("fails if agent not found", () => {
    const result = promoteBranch(db, "nonexistent-agent-id", { skipGitRename: true });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});
