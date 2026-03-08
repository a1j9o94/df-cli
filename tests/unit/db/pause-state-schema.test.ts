import { describe, test, expect } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";

describe("Pause State Schema", () => {
  test("runs table has paused_at column", () => {
    const db = getDbForTest();
    const columns = db
      .prepare("PRAGMA table_info(runs)")
      .all() as { name: string; type: string }[];
    const colNames = columns.map((c) => c.name);
    expect(colNames).toContain("paused_at");
    db.close();
  });

  test("runs table has pause_reason column", () => {
    const db = getDbForTest();
    const columns = db
      .prepare("PRAGMA table_info(runs)")
      .all() as { name: string; type: string }[];
    const colNames = columns.map((c) => c.name);
    expect(colNames).toContain("pause_reason");
    db.close();
  });

  test("paused_at defaults to null", () => {
    const db = getDbForTest();
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, config, created_at, updated_at)
       VALUES ('run_test1', 'spec_test1', 'pending', '{}', ?, ?)`
    ).run(ts, ts);
    const row = db.prepare("SELECT paused_at FROM runs WHERE id = 'run_test1'").get() as { paused_at: string | null };
    expect(row.paused_at).toBeNull();
    db.close();
  });

  test("pause_reason defaults to null", () => {
    const db = getDbForTest();
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, config, created_at, updated_at)
       VALUES ('run_test1', 'spec_test1', 'pending', '{}', ?, ?)`
    ).run(ts, ts);
    const row = db.prepare("SELECT pause_reason FROM runs WHERE id = 'run_test1'").get() as { pause_reason: string | null };
    expect(row.pause_reason).toBeNull();
    db.close();
  });

  test("can set paused_at and pause_reason on a run", () => {
    const db = getDbForTest();
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    db.prepare(
      `INSERT INTO runs (id, spec_id, status, config, created_at, updated_at)
       VALUES ('run_test1', 'spec_test1', 'paused', '{}', ?, ?)`
    ).run(ts, ts);
    db.prepare(
      "UPDATE runs SET paused_at = ?, pause_reason = ? WHERE id = 'run_test1'"
    ).run(ts, "budget_exceeded");
    const row = db.prepare("SELECT paused_at, pause_reason FROM runs WHERE id = 'run_test1'").get() as {
      paused_at: string;
      pause_reason: string;
    };
    expect(row.paused_at).toBe(ts);
    expect(row.pause_reason).toBe("budget_exceeded");
    db.close();
  });
});
