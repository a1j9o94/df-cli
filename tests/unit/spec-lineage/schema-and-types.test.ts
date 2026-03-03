import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("spec schema - parent_spec_id column", () => {
  test("specs table has parent_spec_id column", () => {
    const info = db.prepare("PRAGMA table_info(specs)").all() as Array<{ name: string; type: string }>;
    const parentCol = info.find((col) => col.name === "parent_spec_id");
    expect(parentCol).toBeDefined();
    expect(parentCol!.type).toBe("TEXT");
  });

  test("parent_spec_id defaults to null", () => {
    db.prepare(
      `INSERT INTO specs (id, title, status, file_path, created_at, updated_at)
       VALUES ('spec_001', 'Test', 'draft', 'specs/spec_001.md', datetime('now'), datetime('now'))`
    ).run();
    const spec = db.prepare("SELECT parent_spec_id FROM specs WHERE id = 'spec_001'").get() as { parent_spec_id: string | null };
    expect(spec.parent_spec_id).toBeNull();
  });

  test("parent_spec_id can be set to reference another spec", () => {
    db.prepare(
      `INSERT INTO specs (id, title, status, file_path, created_at, updated_at)
       VALUES ('spec_parent', 'Parent', 'completed', 'specs/spec_parent.md', datetime('now'), datetime('now'))`
    ).run();
    db.prepare(
      `INSERT INTO specs (id, title, status, file_path, parent_spec_id, created_at, updated_at)
       VALUES ('spec_child', 'Child', 'draft', 'specs/spec_child.md', 'spec_parent', datetime('now'), datetime('now'))`
    ).run();
    const spec = db.prepare("SELECT parent_spec_id FROM specs WHERE id = 'spec_child'").get() as { parent_spec_id: string | null };
    expect(spec.parent_spec_id).toBe("spec_parent");
  });

  test("idx_specs_parent index exists for parent_spec_id lookups", () => {
    const indices = db.prepare("PRAGMA index_list(specs)").all() as Array<{ name: string }>;
    const parentIndex = indices.find((idx) => idx.name === "idx_specs_parent");
    expect(parentIndex).toBeDefined();
  });
});
