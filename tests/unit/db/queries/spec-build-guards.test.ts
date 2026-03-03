import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import {
  createSpec,
  getSpec,
  updateSpecStatus,
  updateSpecHash,
} from "../../../../src/db/queries/specs.js";
import {
  canBuildSpec,
  prepareSpecForBuild,
} from "../../../../src/db/queries/spec-build-guards.js";
import { computeContentHash } from "../../../../src/db/queries/spec-extensions.js";
import type { SqliteDb } from "../../../../src/db/index.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("spec build guards (data layer)", () => {
  describe("canBuildSpec", () => {
    test("allows building a draft spec", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      const result = canBuildSpec(db, "spec_001", "spec content", false);
      expect(result.allowed).toBe(true);
    });

    test("rejects building a completed spec", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "completed");

      const result = canBuildSpec(db, "spec_001", "spec content", false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("completed");
      expect(result.suggestion).toContain("dark spec create");
    });

    test("rejects building an archived spec", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "archived");

      const result = canBuildSpec(db, "spec_001", "spec content", false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("archived");
    });

    test("warns when content hash has changed (but still allows)", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      const originalHash = computeContentHash("original content");
      updateSpecHash(db, "spec_001", originalHash);

      const result = canBuildSpec(db, "spec_001", "modified content", false);
      expect(result.allowed).toBe(true);
      expect(result.contentChanged).toBe(true);
      expect(result.warning).toContain("modified");
    });

    test("no warning when content hash matches", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      const hash = computeContentHash("same content");
      updateSpecHash(db, "spec_001", hash);

      const result = canBuildSpec(db, "spec_001", "same content", false);
      expect(result.allowed).toBe(true);
      expect(result.contentChanged).toBe(false);
      expect(result.warning).toBeUndefined();
    });

    test("no warning on first build (no hash stored)", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");

      const result = canBuildSpec(db, "spec_001", "any content", false);
      expect(result.allowed).toBe(true);
      expect(result.contentChanged).toBe(false);
    });

    test("force flag bypasses content hash warning", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      const originalHash = computeContentHash("original content");
      updateSpecHash(db, "spec_001", originalHash);

      const result = canBuildSpec(db, "spec_001", "modified content", true);
      expect(result.allowed).toBe(true);
      expect(result.contentChanged).toBe(false); // suppressed by force
      expect(result.warning).toBeUndefined();
    });

    test("force flag does NOT bypass completed/archived rejection", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "completed");

      const result = canBuildSpec(db, "spec_001", "content", true);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("completed");
    });

    test("returns error for nonexistent spec", () => {
      const result = canBuildSpec(db, "nonexistent", "content", false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("not found");
    });

    test("allows building a spec in ready status", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "ready");

      const result = canBuildSpec(db, "spec_001", "content", false);
      expect(result.allowed).toBe(true);
    });
  });

  describe("prepareSpecForBuild", () => {
    test("transitions draft → building and stores hash", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      const content = "spec file content";

      const result = prepareSpecForBuild(db, "spec_001", content);
      expect(result.success).toBe(true);

      const spec = getSpec(db, "spec_001");
      expect(spec!.status).toBe("building");
      expect(spec!.content_hash).toBe(computeContentHash(content));
    });

    test("fails for completed spec", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "completed");

      const result = prepareSpecForBuild(db, "spec_001", "content");
      expect(result.success).toBe(false);
      expect(result.error).toContain("completed");
    });

    test("fails for archived spec", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "archived");

      const result = prepareSpecForBuild(db, "spec_001", "content");
      expect(result.success).toBe(false);
      expect(result.error).toContain("archived");
    });

    test("fails for nonexistent spec", () => {
      const result = prepareSpecForBuild(db, "nonexistent", "content");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("returns the content hash on success", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      const content = "my spec content";

      const result = prepareSpecForBuild(db, "spec_001", content);
      expect(result.success).toBe(true);
      expect(result.contentHash).toBe(computeContentHash(content));
    });
  });
});
