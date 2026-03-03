import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import {
  createSpec,
  getSpec,
  updateSpecHash,
} from "../../../../src/db/queries/specs.js";
import {
  createSpecWithParent,
  getSpecLineage,
  computeContentHash,
  checkContentHash,
} from "../../../../src/db/queries/spec-extensions.js";
import type { SqliteDb } from "../../../../src/db/index.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("spec type extensions (SpecTypeExtensions contract)", () => {
  describe("parent_spec_id in schema", () => {
    test("specs table has parent_spec_id column (nullable)", () => {
      createSpec(db, "spec_001", "Original spec", "specs/spec_001.md");
      const spec = getSpec(db, "spec_001");
      expect(spec).toBeDefined();
      // parent_spec_id should be null for a spec without a parent
      expect(spec!.parent_spec_id).toBeNull();
    });

    test("createSpecWithParent stores parent reference", () => {
      createSpec(db, "spec_parent", "Parent spec", "specs/spec_parent.md");
      createSpecWithParent(
        db,
        "spec_child",
        "Follow-up spec",
        "specs/spec_child.md",
        "spec_parent",
      );

      const child = getSpec(db, "spec_child");
      expect(child).toBeDefined();
      expect(child!.parent_spec_id).toBe("spec_parent");
      expect(child!.title).toBe("Follow-up spec");
      expect(child!.status).toBe("draft");
    });

    test("createSpecWithParent works without parent (null)", () => {
      const spec = createSpecWithParent(
        db,
        "spec_001",
        "Standalone spec",
        "specs/spec_001.md",
        null,
      );

      expect(spec.parent_spec_id).toBeNull();
    });
  });

  describe("getSpecLineage", () => {
    test("returns single spec for spec with no parent", () => {
      createSpec(db, "spec_001", "Original", "specs/spec_001.md");
      const lineage = getSpecLineage(db, "spec_001");
      expect(lineage).toHaveLength(1);
      expect(lineage[0].id).toBe("spec_001");
    });

    test("returns parent → child chain", () => {
      createSpec(db, "spec_A", "First", "specs/spec_A.md");
      createSpecWithParent(db, "spec_B", "Second", "specs/spec_B.md", "spec_A");

      const lineage = getSpecLineage(db, "spec_B");
      expect(lineage).toHaveLength(2);
      expect(lineage[0].id).toBe("spec_A");
      expect(lineage[1].id).toBe("spec_B");
    });

    test("returns full chain for grandchild", () => {
      createSpec(db, "spec_A", "First", "specs/spec_A.md");
      createSpecWithParent(db, "spec_B", "Second", "specs/spec_B.md", "spec_A");
      createSpecWithParent(db, "spec_C", "Third", "specs/spec_C.md", "spec_B");

      const lineage = getSpecLineage(db, "spec_C");
      expect(lineage).toHaveLength(3);
      expect(lineage[0].id).toBe("spec_A");
      expect(lineage[1].id).toBe("spec_B");
      expect(lineage[2].id).toBe("spec_C");
    });

    test("returns empty array for nonexistent spec", () => {
      const lineage = getSpecLineage(db, "nonexistent");
      expect(lineage).toHaveLength(0);
    });
  });

  describe("computeContentHash", () => {
    test("returns a consistent hash for the same content", () => {
      const hash1 = computeContentHash("hello world");
      const hash2 = computeContentHash("hello world");
      expect(hash1).toBe(hash2);
    });

    test("returns different hashes for different content", () => {
      const hash1 = computeContentHash("hello world");
      const hash2 = computeContentHash("hello world!");
      expect(hash1).not.toBe(hash2);
    });

    test("returns a hex string", () => {
      const hash = computeContentHash("test content");
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    test("handles empty string", () => {
      const hash = computeContentHash("");
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe("checkContentHash", () => {
    test("returns match=true when content hash matches DB", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      const hash = computeContentHash("spec content here");
      updateSpecHash(db, "spec_001", hash);

      const result = checkContentHash(db, "spec_001", "spec content here");
      expect(result.match).toBe(true);
      expect(result.storedHash).toBe(hash);
      expect(result.currentHash).toBe(hash);
    });

    test("returns match=false when content has changed", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      const originalHash = computeContentHash("original content");
      updateSpecHash(db, "spec_001", originalHash);

      const result = checkContentHash(db, "spec_001", "modified content");
      expect(result.match).toBe(false);
      expect(result.storedHash).toBe(originalHash);
      expect(result.currentHash).not.toBe(originalHash);
    });

    test("returns match=true when no hash stored (empty string)", () => {
      createSpec(db, "spec_001", "Test", "specs/spec_001.md");
      // content_hash defaults to '' in the schema

      const result = checkContentHash(db, "spec_001", "any content");
      expect(result.match).toBe(true);
      expect(result.firstBuild).toBe(true);
    });

    test("returns error when spec not found", () => {
      const result = checkContentHash(db, "nonexistent", "content");
      expect(result.match).toBe(false);
      expect(result.error).toContain("not found");
    });
  });
});
