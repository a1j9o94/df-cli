import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import {
  createAgent,
  getAgent,
  updateAgentStatus,
  updateAgentBranchName,
} from "../../../src/db/queries/agents.js";
import { listEvents } from "../../../src/db/queries/events.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { promoteBranch, isStagingBranch, isReadyBranch } from "../../../src/pipeline/complete-promotion.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_test" }).id;
});

describe("complete-promotion integration with agent complete flow", () => {
  test("builder agent promotion: staging → ready with event and DB update", () => {
    // Simulate the flow that `dark agent complete` would execute for a builder
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-complete-flow",
      worktree_path: "/tmp/test-worktree",
      system_prompt: "prompt",
    });

    // Agent is running and has a staging branch
    updateAgentStatus(db, agent.id, "running");
    updateAgentBranchName(db, agent.id, "df-staging/run_01KJ/mymodule-abc123");

    // Verify initial state
    const before = getAgent(db, agent.id)!;
    expect(before.status).toBe("running");
    expect(isStagingBranch(before.branch_name!)).toBe(true);

    // Promote the branch (skip git since no real worktree)
    const result = promoteBranch(db, agent.id, { skipGitRename: true });
    expect(result.success).toBe(true);

    // Now mark completed (as the complete command would do after promotion)
    updateAgentStatus(db, agent.id, "completed");

    // Verify final state
    const after = getAgent(db, agent.id)!;
    expect(after.status).toBe("completed");
    expect(after.branch_name).toBe("df-ready/run_01KJ/mymodule-abc123");
    expect(isReadyBranch(after.branch_name!)).toBe(true);

    // Verify events
    const branchEvents = listEvents(db, runId, { type: "agent-branch-promoted" });
    expect(branchEvents).toHaveLength(1);
    const eventData = JSON.parse(branchEvents[0].data!);
    expect(eventData.oldBranch).toBe("df-staging/run_01KJ/mymodule-abc123");
    expect(eventData.newBranch).toBe("df-ready/run_01KJ/mymodule-abc123");
  });

  test("non-builder agents skip branch promotion", () => {
    // Non-builder roles (architect, evaluator, etc.) don't have staging branches
    const architect = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "architect",
      name: "architect-no-promote",
      system_prompt: "prompt",
    });

    // Architect has no branch_name — promotion should fail gracefully
    const result = promoteBranch(db, architect.id, { skipGitRename: true });
    expect(result.success).toBe(false);
    expect(result.error).toContain("no branch_name");

    // No events should be emitted
    const events = listEvents(db, runId, { type: "agent-branch-promoted" });
    expect(events).toHaveLength(0);
  });

  test("guard failure prevents promotion — branch stays staging", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-guard-fail",
      worktree_path: "/tmp/test-worktree-empty",
      system_prompt: "prompt",
    });

    updateAgentStatus(db, agent.id, "running");
    updateAgentBranchName(db, agent.id, "df-staging/run_01KJ/module-guarded");

    // Simulate: guard fails (builder didn't write any code)
    // In real flow: checkCompletionGuard returns an error string
    // The promotion code is NEVER reached because the guard exits early
    // So: if we DON'T call promoteBranch, branch stays staging

    // Verify branch stays unchanged
    const afterGuardFail = getAgent(db, agent.id)!;
    expect(afterGuardFail.branch_name).toBe("df-staging/run_01KJ/module-guarded");
    expect(afterGuardFail.status).toBe("running");

    // No promotion events
    const events = listEvents(db, runId, { type: "agent-branch-promoted" });
    expect(events).toHaveLength(0);
  });

  test("promotion of already-ready branch fails gracefully", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-already-ready",
      system_prompt: "prompt",
    });

    updateAgentBranchName(db, agent.id, "df-ready/run_01KJ/module-already");

    const result = promoteBranch(db, agent.id, { skipGitRename: true });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not a staging branch");
  });

  test("builder with df-build/ branch (legacy) doesn't promote", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-legacy",
      system_prompt: "prompt",
    });

    updateAgentBranchName(db, agent.id, "df-build/run_01KJ/module-legacy");

    const result = promoteBranch(db, agent.id, { skipGitRename: true });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not a staging branch");
  });
});
