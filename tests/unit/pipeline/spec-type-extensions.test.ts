import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createSpec, getSpec } from "../../../src/db/queries/specs.js";
import type { SpecRecord, SpecFrontmatter } from "../../../src/types/spec.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("SpecTypeExtensions - parent_spec_id", () => {
  test("SpecRecord type includes parent_spec_id as string | null", () => {
    // Create a spec with parent_spec_id
    const spec = createSpec(db, "s1", "Test", "path.md");
    // parent_spec_id should default to null
    expect(spec.parent_spec_id).toBeNull();
  });

  test("createSpec accepts optional parent_spec_id", () => {
    createSpec(db, "s_parent", "Parent", "parent.md");
    const child = createSpec(db, "s_child", "Child", "child.md", "s_parent");
    expect(child.parent_spec_id).toBe("s_parent");
  });

  test("getSpec returns parent_spec_id correctly", () => {
    createSpec(db, "s_parent", "Parent", "parent.md");
    createSpec(db, "s_child", "Child", "child.md", "s_parent");
    const fetched = getSpec(db, "s_child");
    expect(fetched).not.toBeNull();
    expect(fetched!.parent_spec_id).toBe("s_parent");
  });

  test("SpecFrontmatter type allows optional parent_spec_id", () => {
    // Type-level check: this should compile without errors
    const frontmatter: SpecFrontmatter = {
      id: "spec_001",
      title: "Test",
      type: "feature",
      status: "draft",
      version: "0.1.0",
      priority: "high",
    };
    expect(frontmatter.parent_spec_id).toBeUndefined();

    const frontmatterWithParent: SpecFrontmatter = {
      id: "spec_002",
      title: "Follow-up",
      type: "feature",
      status: "draft",
      version: "0.1.0",
      priority: "high",
      parent_spec_id: "spec_001",
    };
    expect(frontmatterWithParent.parent_spec_id).toBe("spec_001");
  });
});
