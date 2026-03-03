import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createSpec, getSpec, updateSpecStatus } from "../../../src/db/queries/specs.js";
import { executeSpecArchive } from "../../../src/commands/spec/archive.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("executeSpecArchive", () => {
  test("archives a draft spec", () => {
    createSpec(db, "spec_001", "Draft Spec", "specs/spec_001.md");
    const result = executeSpecArchive(db, "spec_001");
    expect(result.status).toBe("archived");
    expect(getSpec(db, "spec_001")!.status).toBe("archived");
  });

  test("archives a completed spec", () => {
    createSpec(db, "spec_001", "Completed Spec", "specs/spec_001.md");
    updateSpecStatus(db, "spec_001", "completed");
    const result = executeSpecArchive(db, "spec_001");
    expect(result.status).toBe("archived");
  });

  test("archives a building spec", () => {
    createSpec(db, "spec_001", "Building Spec", "specs/spec_001.md");
    updateSpecStatus(db, "spec_001", "building");
    const result = executeSpecArchive(db, "spec_001");
    expect(result.status).toBe("archived");
  });

  test("throws error for nonexistent spec", () => {
    expect(() => executeSpecArchive(db, "spec_NOPE")).toThrow("not found");
  });

  test("throws error if spec is already archived", () => {
    createSpec(db, "spec_001", "Already Archived", "specs/spec_001.md");
    updateSpecStatus(db, "spec_001", "archived");
    expect(() => executeSpecArchive(db, "spec_001")).toThrow("already archived");
  });

  test("returns the updated spec record", () => {
    createSpec(db, "spec_001", "Test", "specs/spec_001.md");
    const result = executeSpecArchive(db, "spec_001");
    expect(result.id).toBe("spec_001");
    expect(result.title).toBe("Test");
    expect(result.status).toBe("archived");
  });
});
