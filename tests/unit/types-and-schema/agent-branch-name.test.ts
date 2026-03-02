import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import {
  createAgent,
  getAgent,
} from "../../../src/db/queries/agents.js";
import type { SqliteDb } from "../../../src/db/index.js";
import type { AgentRecord } from "../../../src/types/agent.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_test" }).id;
});

describe("AgentRecord branch_name field", () => {
  test("AgentRecord type includes branch_name field", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-branch",
      system_prompt: "prompt",
    });

    // branch_name should exist on the record (initially null)
    const record: AgentRecord = agent;
    expect(record.branch_name).toBeNull();
  });

  test("agents table has branch_name column in DB", () => {
    // Verify the column exists by querying PRAGMA
    const columns = db
      .prepare("PRAGMA table_info(agents)")
      .all() as { name: string; type: string }[];

    const columnNames = columns.map((c) => c.name);
    expect(columnNames).toContain("branch_name");
  });

  test("branch_name defaults to null on creation", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-default",
      system_prompt: "prompt",
    });

    expect(agent.branch_name).toBeNull();
  });

  test("branch_name can be set via direct SQL update", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-branch-set",
      system_prompt: "prompt",
    });

    db.prepare("UPDATE agents SET branch_name = ? WHERE id = ?").run(
      "df-ready/run_01KJ/module-abc123",
      agent.id,
    );

    const updated = getAgent(db, agent.id)!;
    expect(updated.branch_name).toBe("df-ready/run_01KJ/module-abc123");
  });

  test("branch_name supports staging and ready branch patterns", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-patterns",
      system_prompt: "prompt",
    });

    // Test staging branch pattern
    db.prepare("UPDATE agents SET branch_name = ? WHERE id = ?").run(
      "df-staging/run_01KJ/module-abc123",
      agent.id,
    );
    let updated = getAgent(db, agent.id)!;
    expect(updated.branch_name).toBe("df-staging/run_01KJ/module-abc123");

    // Test ready branch pattern (after promotion)
    db.prepare("UPDATE agents SET branch_name = ? WHERE id = ?").run(
      "df-ready/run_01KJ/module-abc123",
      agent.id,
    );
    updated = getAgent(db, agent.id)!;
    expect(updated.branch_name).toBe("df-ready/run_01KJ/module-abc123");
  });
});
