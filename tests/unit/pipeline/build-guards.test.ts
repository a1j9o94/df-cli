import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createSpec, getSpec, updateSpecStatus, updateSpecHash } from "../../../src/db/queries/specs.js";
import {
  validateStatusTransition,
  updateSpecStatusChecked,
  computeContentHash,
  getLatestRunForSpec,
} from "../../../src/pipeline/build-guards.js";
import { createRun, updateRunStatus } from "../../../src/db/queries/runs.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("validateStatusTransition", () => {
  test("allows draft -> building", () => {
    expect(validateStatusTransition("draft", "building")).toBe(true);
  });

  test("allows building -> completed", () => {
    expect(validateStatusTransition("building", "completed")).toBe(true);
  });

  test("allows building -> draft (failure rollback)", () => {
    expect(validateStatusTransition("building", "draft")).toBe(true);
  });

  test("allows draft -> archived", () => {
    expect(validateStatusTransition("draft", "archived")).toBe(true);
  });

  test("allows ready -> building", () => {
    expect(validateStatusTransition("ready", "building")).toBe(true);
  });

  test("allows ready -> archived", () => {
    expect(validateStatusTransition("ready", "archived")).toBe(true);
  });

  test("allows completed -> archived", () => {
    expect(validateStatusTransition("completed", "archived")).toBe(true);
  });

  test("rejects completed -> draft", () => {
    expect(() => validateStatusTransition("completed", "draft")).toThrow();
  });

  test("rejects completed -> building", () => {
    expect(() => validateStatusTransition("completed", "building")).toThrow();
  });

  test("rejects archived -> draft", () => {
    expect(() => validateStatusTransition("archived", "draft")).toThrow();
  });

  test("rejects archived -> building", () => {
    expect(() => validateStatusTransition("archived", "building")).toThrow();
  });

  test("rejects same-status transition", () => {
    expect(() => validateStatusTransition("draft", "draft")).toThrow();
  });
});

describe("updateSpecStatusChecked", () => {
  test("updates status for valid transition", () => {
    createSpec(db, "s1", "Test", "path.md");
    updateSpecStatusChecked(db, "s1", "building");
    expect(getSpec(db, "s1")!.status).toBe("building");
  });

  test("throws for invalid transition", () => {
    createSpec(db, "s1", "Test", "path.md");
    updateSpecStatus(db, "s1", "completed");
    expect(() => updateSpecStatusChecked(db, "s1", "draft")).toThrow();
  });

  test("throws for missing spec", () => {
    expect(() => updateSpecStatusChecked(db, "nonexistent", "building")).toThrow();
  });
});

describe("computeContentHash", () => {
  test("returns a hex string", () => {
    // Write a temp file and hash it
    const tmpFile = `/tmp/test-spec-${Date.now()}.md`;
    Bun.write(tmpFile, "---\nid: test\n---\n\n# Hello");
    const hash = computeContentHash(tmpFile);
    expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
  });

  test("same content produces same hash", () => {
    const tmpFile1 = `/tmp/test-spec-a-${Date.now()}.md`;
    const tmpFile2 = `/tmp/test-spec-b-${Date.now()}.md`;
    const content = "---\nid: test\n---\n\n# Same content";
    Bun.write(tmpFile1, content);
    Bun.write(tmpFile2, content);
    expect(computeContentHash(tmpFile1)).toBe(computeContentHash(tmpFile2));
  });

  test("different content produces different hash", () => {
    const tmpFile1 = `/tmp/test-spec-c-${Date.now()}.md`;
    const tmpFile2 = `/tmp/test-spec-d-${Date.now()}.md`;
    Bun.write(tmpFile1, "content A");
    Bun.write(tmpFile2, "content B");
    expect(computeContentHash(tmpFile1)).not.toBe(computeContentHash(tmpFile2));
  });
});

describe("getLatestRunForSpec", () => {
  test("returns null when no runs exist", () => {
    expect(getLatestRunForSpec(db, "spec_none")).toBeNull();
  });

  test("returns a run when one exists for a spec", () => {
    createSpec(db, "s1", "Test", "path.md");
    const run1 = createRun(db, { spec_id: "s1" });
    const latest = getLatestRunForSpec(db, "s1");
    expect(latest).not.toBeNull();
    expect(latest!.id).toBe(run1.id);
  });

  test("only returns runs for the specified spec", () => {
    createSpec(db, "s1", "One", "p1.md");
    createSpec(db, "s2", "Two", "p2.md");
    createRun(db, { spec_id: "s1" });
    const run2 = createRun(db, { spec_id: "s2" });
    const latest = getLatestRunForSpec(db, "s2");
    expect(latest!.id).toBe(run2.id);
  });
});
