import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createSpec, getSpec, updateSpecStatus, updateSpecHash } from "../../../src/db/queries/specs.js";
import { createRun } from "../../../src/db/queries/runs.js";
import {
  preBuildValidation,
  type PreBuildResult,
} from "../../../src/pipeline/build-guards.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("preBuildValidation", () => {
  describe("Guard 1: STATUS CHECK - reject completed/archived specs", () => {
    test("rejects completed spec with helpful message", () => {
      createSpec(db, "s1", "Auth Feature", "specs/s1.md");
      updateSpecStatus(db, "s1", "building");
      updateSpecStatus(db, "s1", "completed");

      const result = preBuildValidation(db, "s1", "specs/s1.md", false);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain("already completed");
      expect(result.error).toContain("dark spec create");
    });

    test("rejects archived spec with helpful message", () => {
      createSpec(db, "s1", "Auth Feature", "specs/s1.md");
      updateSpecStatus(db, "s1", "archived");

      const result = preBuildValidation(db, "s1", "specs/s1.md", false);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain("archived");
      expect(result.error).toContain("dark spec create");
    });

    test("--force does NOT bypass status check on completed specs", () => {
      createSpec(db, "s1", "Auth Feature", "specs/s1.md");
      updateSpecStatus(db, "s1", "building");
      updateSpecStatus(db, "s1", "completed");

      const result = preBuildValidation(db, "s1", "specs/s1.md", true);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain("already completed");
    });

    test("--force does NOT bypass status check on archived specs", () => {
      createSpec(db, "s1", "Auth Feature", "specs/s1.md");
      updateSpecStatus(db, "s1", "archived");

      const result = preBuildValidation(db, "s1", "specs/s1.md", true);
      expect(result.allowed).toBe(false);
    });
  });

  describe("Guard 2: HASH CHECK - warn on content mismatch", () => {
    test("warns when spec file changed since last build", () => {
      const tmpFile = `/tmp/test-spec-hash-${Date.now()}.md`;
      Bun.write(tmpFile, "---\nid: s1\n---\n\n# Original");
      createSpec(db, "s1", "Auth Feature", tmpFile);
      updateSpecHash(db, "s1", "original_hash_that_doesnt_match");
      createRun(db, { spec_id: "s1" });

      const result = preBuildValidation(db, "s1", tmpFile, false);
      expect(result.allowed).toBe(false);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("modified since the last build");
      expect(result.warning).toContain("dark spec create");
      expect(result.warning).toContain("--force");
    });

    test("--force bypasses hash check", () => {
      const tmpFile = `/tmp/test-spec-hash-force-${Date.now()}.md`;
      Bun.write(tmpFile, "---\nid: s1\n---\n\n# Modified");
      createSpec(db, "s1", "Auth Feature", tmpFile);
      updateSpecHash(db, "s1", "original_hash_that_doesnt_match");
      createRun(db, { spec_id: "s1" });

      const result = preBuildValidation(db, "s1", tmpFile, true);
      expect(result.allowed).toBe(true);
    });

    test("no warning when hash matches", () => {
      const tmpFile = `/tmp/test-spec-hash-match-${Date.now()}.md`;
      const content = "---\nid: s1\n---\n\n# Same Content";
      Bun.write(tmpFile, content);
      createSpec(db, "s1", "Auth Feature", tmpFile);
      // Set the hash to match current content
      const { computeContentHash } = require("../../../src/pipeline/build-guards.js");
      const hash = computeContentHash(tmpFile);
      updateSpecHash(db, "s1", hash);
      createRun(db, { spec_id: "s1" });

      const result = preBuildValidation(db, "s1", tmpFile, false);
      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    test("no warning when no previous runs exist (first build)", () => {
      const tmpFile = `/tmp/test-spec-first-build-${Date.now()}.md`;
      Bun.write(tmpFile, "---\nid: s1\n---\n\n# First Build");
      createSpec(db, "s1", "Auth Feature", tmpFile);

      const result = preBuildValidation(db, "s1", tmpFile, false);
      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    test("no warning when stored hash is empty (first build)", () => {
      const tmpFile = `/tmp/test-spec-empty-hash-${Date.now()}.md`;
      Bun.write(tmpFile, "---\nid: s1\n---\n\n# First Build");
      createSpec(db, "s1", "Auth Feature", tmpFile);
      // content_hash defaults to '' — this means it hasn't been hashed before
      createRun(db, { spec_id: "s1" });

      const result = preBuildValidation(db, "s1", tmpFile, false);
      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe("Guard 3: STATUS TRANSITION - set to building before engine", () => {
    test("allows draft spec to proceed", () => {
      const tmpFile = `/tmp/test-spec-draft-${Date.now()}.md`;
      Bun.write(tmpFile, "---\nid: s1\n---\n\n# Draft");
      createSpec(db, "s1", "Auth Feature", tmpFile);

      const result = preBuildValidation(db, "s1", tmpFile, false);
      expect(result.allowed).toBe(true);
    });

    test("allows ready spec to proceed", () => {
      const tmpFile = `/tmp/test-spec-ready-${Date.now()}.md`;
      Bun.write(tmpFile, "---\nid: s1\n---\n\n# Ready");
      createSpec(db, "s1", "Auth Feature", tmpFile);
      updateSpecStatus(db, "s1", "ready");

      const result = preBuildValidation(db, "s1", tmpFile, false);
      expect(result.allowed).toBe(true);
    });

    test("allows building spec to proceed (retry case)", () => {
      const tmpFile = `/tmp/test-spec-building-${Date.now()}.md`;
      Bun.write(tmpFile, "---\nid: s1\n---\n\n# Building");
      createSpec(db, "s1", "Auth Feature", tmpFile);
      updateSpecStatus(db, "s1", "building");

      const result = preBuildValidation(db, "s1", tmpFile, false);
      expect(result.allowed).toBe(true);
    });
  });

  describe("spec not found", () => {
    test("rejects when spec does not exist", () => {
      const result = preBuildValidation(db, "nonexistent", "path.md", false);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain("not found");
    });
  });
});
