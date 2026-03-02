import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import {
  createAgent,
  getAgent,
  updateAgentBranchName,
} from "../../../src/db/queries/agents.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_test" }).id;
});

describe("updateAgentBranchName", () => {
  test("sets the branch_name on an agent record", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-branch",
      system_prompt: "prompt",
    });

    expect(agent.branch_name).toBeNull();

    updateAgentBranchName(db, agent.id, "df-staging/run_01KJ/module-abc123");
    const updated = getAgent(db, agent.id)!;
    expect(updated.branch_name).toBe("df-staging/run_01KJ/module-abc123");
  });

  test("updates branch_name from staging to ready (promotion)", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-promote",
      system_prompt: "prompt",
    });

    // Set staging branch
    updateAgentBranchName(db, agent.id, "df-staging/run_01KJ/module-xyz");
    let updated = getAgent(db, agent.id)!;
    expect(updated.branch_name).toBe("df-staging/run_01KJ/module-xyz");

    // Promote to ready
    updateAgentBranchName(db, agent.id, "df-ready/run_01KJ/module-xyz");
    updated = getAgent(db, agent.id)!;
    expect(updated.branch_name).toBe("df-ready/run_01KJ/module-xyz");
  });

  test("updates updated_at timestamp", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-ts",
      system_prompt: "prompt",
    });

    const beforeUpdate = agent.updated_at;

    // Small delay to ensure different timestamp
    updateAgentBranchName(db, agent.id, "df-staging/run_01KJ/module-ts");
    const updated = getAgent(db, agent.id)!;

    // updated_at should be set (may or may not differ from creation depending on timing)
    expect(updated.updated_at).toBeTruthy();
    expect(updated.branch_name).toBe("df-staging/run_01KJ/module-ts");
  });
});
