import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createSpec, getSpec, updateSpecStatus } from "../../../src/db/queries/specs.js";
import {
  preBuildValidation,
  updateSpecStatusChecked,
  computeContentHash,
} from "../../../src/pipeline/build-guards.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("Engine lifecycle guards integration", () => {
  test("pre-build validation rejects completed spec before engine can run", () => {
    createSpec(db, "s1", "Auth", ".df/specs/s1.md");
    updateSpecStatus(db, "s1", "building");
    updateSpecStatus(db, "s1", "completed");

    const result = preBuildValidation(db, "s1", ".df/specs/s1.md", false);
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("already completed");
    expect(result.error).toContain("dark spec create");
  });

  test("pre-build validation rejects archived spec before engine can run", () => {
    createSpec(db, "s1", "Auth", ".df/specs/s1.md");
    updateSpecStatus(db, "s1", "archived");

    const result = preBuildValidation(db, "s1", ".df/specs/s1.md", false);
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("archived");
  });

  test("building status is set via checked transition after validation passes", () => {
    const tmpFile = `/tmp/test-engine-build-${Date.now()}.md`;
    Bun.write(tmpFile, "---\nid: s1\n---\n\n# Build Me");
    createSpec(db, "s1", "Auth", tmpFile);

    const validation = preBuildValidation(db, "s1", tmpFile, false);
    expect(validation.allowed).toBe(true);

    // Now set to building (what engine.execute would do)
    updateSpecStatusChecked(db, "s1", "building");
    expect(getSpec(db, "s1")!.status).toBe("building");
  });

  test("content hash is computed and stored before build starts", () => {
    const tmpFile = `/tmp/test-engine-hash-store-${Date.now()}.md`;
    const content = "---\nid: s1\n---\n\n# Hash Me";
    Bun.write(tmpFile, content);
    createSpec(db, "s1", "Auth", tmpFile);

    // This is what the build command does before engine.execute
    const hash = computeContentHash(tmpFile);
    db.prepare("UPDATE specs SET content_hash = ? WHERE id = ?").run(hash, "s1");

    expect(getSpec(db, "s1")!.content_hash).toBe(hash);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("on failure, spec rolls back to draft", () => {
    createSpec(db, "s1", "Auth", "path.md");
    updateSpecStatusChecked(db, "s1", "building");

    // Simulate engine failure — roll back to draft
    updateSpecStatusChecked(db, "s1", "draft");
    expect(getSpec(db, "s1")!.status).toBe("draft");
  });

  test("on success, spec transitions to completed", () => {
    createSpec(db, "s1", "Auth", "path.md");
    updateSpecStatusChecked(db, "s1", "building");

    // Simulate engine success
    updateSpecStatusChecked(db, "s1", "completed");
    expect(getSpec(db, "s1")!.status).toBe("completed");
  });

  test("completed spec cannot be rebuilt - must create new spec", () => {
    createSpec(db, "s1", "Auth", "path.md");
    updateSpecStatusChecked(db, "s1", "building");
    updateSpecStatusChecked(db, "s1", "completed");

    const result = preBuildValidation(db, "s1", "path.md", false);
    expect(result.allowed).toBe(false);
  });

  test("force flag does not bypass status check on completed", () => {
    createSpec(db, "s1", "Auth", "path.md");
    updateSpecStatusChecked(db, "s1", "building");
    updateSpecStatusChecked(db, "s1", "completed");

    const result = preBuildValidation(db, "s1", "path.md", true);
    expect(result.allowed).toBe(false);
  });
});
