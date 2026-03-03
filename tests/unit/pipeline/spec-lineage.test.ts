import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createSpec, getSpec, updateSpecStatus } from "../../../src/db/queries/specs.js";
import {
  archiveSpec,
  getSpecLineage,
} from "../../../src/pipeline/build-guards.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("archiveSpec", () => {
  test("archives a draft spec", () => {
    createSpec(db, "s1", "Test", "path.md");
    archiveSpec(db, "s1");
    expect(getSpec(db, "s1")!.status).toBe("archived");
  });

  test("archives a completed spec", () => {
    createSpec(db, "s1", "Test", "path.md");
    updateSpecStatus(db, "s1", "building");
    updateSpecStatus(db, "s1", "completed");
    archiveSpec(db, "s1");
    expect(getSpec(db, "s1")!.status).toBe("archived");
  });

  test("throws when archiving an already archived spec", () => {
    createSpec(db, "s1", "Test", "path.md");
    updateSpecStatus(db, "s1", "archived");
    expect(() => archiveSpec(db, "s1")).toThrow();
  });

  test("throws for a building spec (invalid transition)", () => {
    createSpec(db, "s1", "Test", "path.md");
    updateSpecStatus(db, "s1", "building");
    expect(() => archiveSpec(db, "s1")).toThrow();
  });

  test("throws for nonexistent spec", () => {
    expect(() => archiveSpec(db, "nonexistent")).toThrow();
  });
});

describe("getSpecLineage", () => {
  test("returns single spec when no lineage", () => {
    createSpec(db, "s1", "First", "p1.md");
    const lineage = getSpecLineage(db, "s1");
    expect(lineage).toHaveLength(1);
    expect(lineage[0].id).toBe("s1");
  });

  test("returns parent -> child chain (oldest-first)", () => {
    createSpec(db, "s1", "Parent", "p1.md");
    createSpec(db, "s2", "Child", "p2.md", "s1");
    const lineage = getSpecLineage(db, "s2");
    expect(lineage).toHaveLength(2);
    expect(lineage[0].id).toBe("s1"); // parent first (oldest)
    expect(lineage[1].id).toBe("s2"); // child last (newest)
  });

  test("returns full chain: grandparent -> parent -> child", () => {
    createSpec(db, "s1", "Grandparent", "p1.md");
    createSpec(db, "s2", "Parent", "p2.md", "s1");
    createSpec(db, "s3", "Child", "p3.md", "s2");
    const lineage = getSpecLineage(db, "s3");
    expect(lineage).toHaveLength(3);
    expect(lineage[0].id).toBe("s1");
    expect(lineage[1].id).toBe("s2");
    expect(lineage[2].id).toBe("s3");
  });

  test("works starting from root (no parent)", () => {
    createSpec(db, "s1", "Root", "p1.md");
    createSpec(db, "s2", "Child", "p2.md", "s1");
    const lineage = getSpecLineage(db, "s1");
    expect(lineage).toHaveLength(1);
    expect(lineage[0].id).toBe("s1");
  });

  test("returns empty array for nonexistent spec", () => {
    const lineage = getSpecLineage(db, "nonexistent");
    expect(lineage).toHaveLength(0);
  });
});
