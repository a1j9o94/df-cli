import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createSpec, getSpec, updateSpecStatus, updateSpecHash } from "../../../src/db/queries/specs.js";
import { createRun, getRun, updateRunStatus } from "../../../src/db/queries/runs.js";
import { updateSpecStatusChecked, computeContentHash } from "../../../src/pipeline/build-guards.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("Build lifecycle: spec status transitions through pipeline", () => {
  test("draft -> building transition on build start", () => {
    createSpec(db, "s1", "Auth", "path.md");
    expect(getSpec(db, "s1")!.status).toBe("draft");

    updateSpecStatusChecked(db, "s1", "building");
    expect(getSpec(db, "s1")!.status).toBe("building");
  });

  test("building -> completed on successful pipeline", () => {
    createSpec(db, "s1", "Auth", "path.md");
    updateSpecStatusChecked(db, "s1", "building");

    updateSpecStatusChecked(db, "s1", "completed");
    expect(getSpec(db, "s1")!.status).toBe("completed");
  });

  test("building -> draft on pipeline failure (retry possible)", () => {
    createSpec(db, "s1", "Auth", "path.md");
    updateSpecStatusChecked(db, "s1", "building");

    updateSpecStatusChecked(db, "s1", "draft");
    expect(getSpec(db, "s1")!.status).toBe("draft");
  });

  test("completed -> building is rejected (must create new spec)", () => {
    createSpec(db, "s1", "Auth", "path.md");
    updateSpecStatusChecked(db, "s1", "building");
    updateSpecStatusChecked(db, "s1", "completed");

    expect(() => updateSpecStatusChecked(db, "s1", "building")).toThrow(/Invalid spec status transition/);
  });

  test("completed -> draft is rejected", () => {
    createSpec(db, "s1", "Auth", "path.md");
    updateSpecStatusChecked(db, "s1", "building");
    updateSpecStatusChecked(db, "s1", "completed");

    expect(() => updateSpecStatusChecked(db, "s1", "draft")).toThrow(/Invalid spec status transition/);
  });

  test("completed -> archived is allowed", () => {
    createSpec(db, "s1", "Auth", "path.md");
    updateSpecStatusChecked(db, "s1", "building");
    updateSpecStatusChecked(db, "s1", "completed");

    updateSpecStatusChecked(db, "s1", "archived");
    expect(getSpec(db, "s1")!.status).toBe("archived");
  });

  test("archived -> anything is rejected", () => {
    createSpec(db, "s1", "Auth", "path.md");
    updateSpecStatusChecked(db, "s1", "archived");

    expect(() => updateSpecStatusChecked(db, "s1", "draft")).toThrow();
    expect(() => updateSpecStatusChecked(db, "s1", "building")).toThrow();
    expect(() => updateSpecStatusChecked(db, "s1", "completed")).toThrow();
  });

  test("ready -> building transition is allowed", () => {
    createSpec(db, "s1", "Auth", "path.md");
    updateSpecStatus(db, "s1", "ready"); // using unchecked to set to ready

    updateSpecStatusChecked(db, "s1", "building");
    expect(getSpec(db, "s1")!.status).toBe("building");
  });

  test("full lifecycle: draft -> building -> completed -> archived", () => {
    createSpec(db, "s1", "Auth Feature", "specs/auth.md");

    // Start build
    updateSpecStatusChecked(db, "s1", "building");
    expect(getSpec(db, "s1")!.status).toBe("building");

    // Build succeeds
    updateSpecStatusChecked(db, "s1", "completed");
    expect(getSpec(db, "s1")!.status).toBe("completed");

    // Archive old spec
    updateSpecStatusChecked(db, "s1", "archived");
    expect(getSpec(db, "s1")!.status).toBe("archived");
  });

  test("retry lifecycle: draft -> building -> draft -> building -> completed", () => {
    createSpec(db, "s1", "Auth Feature", "specs/auth.md");

    // Start build
    updateSpecStatusChecked(db, "s1", "building");

    // Build fails, rollback to draft
    updateSpecStatusChecked(db, "s1", "draft");
    expect(getSpec(db, "s1")!.status).toBe("draft");

    // Retry build
    updateSpecStatusChecked(db, "s1", "building");

    // Build succeeds
    updateSpecStatusChecked(db, "s1", "completed");
    expect(getSpec(db, "s1")!.status).toBe("completed");
  });
});

describe("Content hash tracking through build lifecycle", () => {
  test("content hash is stored before build starts", () => {
    const tmpFile = `/tmp/test-lifecycle-hash-${Date.now()}.md`;
    Bun.write(tmpFile, "---\nid: s1\n---\n\n# Test spec");
    createSpec(db, "s1", "Test", tmpFile);

    const hash = computeContentHash(tmpFile);
    updateSpecHash(db, "s1", hash);

    expect(getSpec(db, "s1")!.content_hash).toBe(hash);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
