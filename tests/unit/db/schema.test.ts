import { describe, test, expect } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";

describe("Database Schema", () => {
  test("schema applies cleanly to a fresh database", () => {
    const db = getDbForTest();
    expect(db).toBeDefined();
    db.close();
  });

  test("all tables exist", () => {
    const db = getDbForTest();

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("runs");
    expect(tableNames).toContain("agents");
    expect(tableNames).toContain("specs");
    expect(tableNames).toContain("buildplans");
    expect(tableNames).toContain("contracts");
    expect(tableNames).toContain("contract_bindings");
    expect(tableNames).toContain("builder_dependencies");
    expect(tableNames).toContain("messages");
    expect(tableNames).toContain("events");
    expect(tableNames).toContain("resources");

    db.close();
  });

  test("parallel_build_progress view exists", () => {
    const db = getDbForTest();

    const views = db
      .prepare("SELECT name FROM sqlite_master WHERE type='view'")
      .all() as { name: string }[];

    const viewNames = views.map((v) => v.name);
    expect(viewNames).toContain("parallel_build_progress");

    db.close();
  });

  test("indexes are created", () => {
    const db = getDbForTest();

    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
      .all() as { name: string }[];

    const indexNames = indexes.map((i) => i.name);

    expect(indexNames).toContain("idx_agents_run");
    expect(indexNames).toContain("idx_agents_role");
    expect(indexNames).toContain("idx_agents_status");
    expect(indexNames).toContain("idx_specs_status");
    expect(indexNames).toContain("idx_buildplans_run");
    expect(indexNames).toContain("idx_buildplans_spec");
    expect(indexNames).toContain("idx_buildplans_status");
    expect(indexNames).toContain("idx_contracts_run");
    expect(indexNames).toContain("idx_contracts_buildplan");
    expect(indexNames).toContain("idx_bindings_contract");
    expect(indexNames).toContain("idx_bindings_agent");
    expect(indexNames).toContain("idx_deps_builder");
    expect(indexNames).toContain("idx_deps_run");
    expect(indexNames).toContain("idx_messages_run");
    expect(indexNames).toContain("idx_messages_to_agent");
    expect(indexNames).toContain("idx_messages_to_role");
    expect(indexNames).toContain("idx_events_run");
    expect(indexNames).toContain("idx_events_type");
    expect(indexNames).toContain("idx_events_agent");

    db.close();
  });

  test("foreign keys are enforced", () => {
    const db = getDbForTest();

    const fkResult = db
      .prepare("PRAGMA foreign_keys")
      .get() as { foreign_keys: number };
    expect(fkResult.foreign_keys).toBe(1);

    db.close();
  });

  test("WAL mode is set (memory DB falls back to 'memory')", () => {
    const db = getDbForTest();

    const walResult = db
      .prepare("PRAGMA journal_mode")
      .get() as { journal_mode: string };
    // In-memory databases can't use WAL, so they report "memory"
    // On-disk databases will report "wal"
    expect(["wal", "memory"]).toContain(walResult.journal_mode);

    db.close();
  });
});
