import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import {
  createSpec, getSpec, listSpecs, updateSpecStatus, updateSpecHash,
} from "../../../../src/db/queries/specs.js";
import type { SqliteDb } from "../../../../src/db/index.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("specs queries", () => {
  test("createSpec inserts and returns a spec", () => {
    const spec = createSpec(db, "spec_001", "Add auth", ".df/specs/spec_001.md");
    expect(spec.id).toBe("spec_001");
    expect(spec.title).toBe("Add auth");
    expect(spec.status).toBe("draft");
    expect(spec.file_path).toBe(".df/specs/spec_001.md");
  });

  test("getSpec returns null for missing", () => {
    expect(getSpec(db, "nope")).toBeNull();
  });

  test("listSpecs returns all or filtered", () => {
    createSpec(db, "s1", "One", "p1");
    createSpec(db, "s2", "Two", "p2");
    updateSpecStatus(db, "s1", "ready");

    expect(listSpecs(db)).toHaveLength(2);
    expect(listSpecs(db, "draft")).toHaveLength(1);
    expect(listSpecs(db, "ready")).toHaveLength(1);
  });

  test("updateSpecStatus changes status", () => {
    createSpec(db, "s1", "Title", "path");
    updateSpecStatus(db, "s1", "building");
    expect(getSpec(db, "s1")!.status).toBe("building");
  });

  test("updateSpecHash changes content hash", () => {
    createSpec(db, "s1", "Title", "path");
    updateSpecHash(db, "s1", "abc123");
    expect(getSpec(db, "s1")!.content_hash).toBe("abc123");
  });
});
