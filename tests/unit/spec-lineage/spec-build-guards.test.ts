import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createSpec, getSpec, updateSpecStatus, updateSpecHash } from "../../../src/db/queries/specs.js";
import {
  checkSpecBuildable,
  type BuildGuardResult,
} from "../../../src/pipeline/spec-build-guards.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("checkSpecBuildable", () => {
  describe("Guard 1: refuses completed/archived specs", () => {
    test("rejects completed specs", () => {
      createSpec(db, "spec_001", "Completed Spec", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "completed");

      const result = checkSpecBuildable(db, "spec_001");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("already completed");
      expect(result.suggestion).toContain("dark spec create");
    });

    test("rejects archived specs", () => {
      createSpec(db, "spec_001", "Archived Spec", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "archived");

      const result = checkSpecBuildable(db, "spec_001");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("archived");
      expect(result.suggestion).toContain("dark spec create");
    });

    test("allows draft specs", () => {
      createSpec(db, "spec_001", "Draft Spec", "specs/spec_001.md");

      const result = checkSpecBuildable(db, "spec_001");
      expect(result.allowed).toBe(true);
    });

    test("allows building specs (retry case)", () => {
      createSpec(db, "spec_001", "Building Spec", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "building");

      const result = checkSpecBuildable(db, "spec_001");
      expect(result.allowed).toBe(true);
    });
  });

  describe("Guard 2: content hash mismatch warning", () => {
    test("warns when spec content hash differs from stored hash", () => {
      createSpec(db, "spec_001", "Modified Spec", "specs/spec_001.md");
      updateSpecHash(db, "spec_001", "original_hash_123");

      const result = checkSpecBuildable(db, "spec_001", {
        currentContentHash: "different_hash_456",
      });

      expect(result.allowed).toBe(true); // Allowed but with warning
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("modified");
    });

    test("no warning when content hash matches", () => {
      createSpec(db, "spec_001", "Unchanged Spec", "specs/spec_001.md");
      updateSpecHash(db, "spec_001", "hash_abc");

      const result = checkSpecBuildable(db, "spec_001", {
        currentContentHash: "hash_abc",
      });

      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    test("no warning when no previous hash exists (first build)", () => {
      createSpec(db, "spec_001", "New Spec", "specs/spec_001.md");

      const result = checkSpecBuildable(db, "spec_001", {
        currentContentHash: "any_hash",
      });

      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    test("force flag bypasses content hash warning", () => {
      createSpec(db, "spec_001", "Modified Spec", "specs/spec_001.md");
      updateSpecHash(db, "spec_001", "original_hash");

      const result = checkSpecBuildable(db, "spec_001", {
        currentContentHash: "changed_hash",
        force: true,
      });

      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe("Guard 3: status transitions", () => {
    test("draft → building is valid (first build)", () => {
      createSpec(db, "spec_001", "New Spec", "specs/spec_001.md");

      const result = checkSpecBuildable(db, "spec_001");
      expect(result.allowed).toBe(true);
    });

    test("completed spec is rejected", () => {
      createSpec(db, "spec_001", "Done Spec", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "completed");

      const result = checkSpecBuildable(db, "spec_001");
      expect(result.allowed).toBe(false);
    });
  });

  describe("spec not found", () => {
    test("returns not found error for missing spec", () => {
      const result = checkSpecBuildable(db, "spec_NONEXISTENT");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("not found");
    });
  });
});
