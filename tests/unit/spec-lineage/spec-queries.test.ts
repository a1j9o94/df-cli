import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import {
  createSpec,
  getSpec,
  updateSpecStatus,
} from "../../../src/db/queries/specs.js";
import {
  createSpecFrom,
  getSpecChildren,
  getSpecLineage,
  archiveSpec,
  validateStatusTransition,
  type StatusTransitionResult,
} from "../../../src/db/queries/spec-lineage.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("createSpecFrom", () => {
  test("creates a new spec with parent_spec_id referencing the source", () => {
    createSpec(db, "spec_parent", "Original Spec", "specs/spec_parent.md");
    const child = createSpecFrom(db, "spec_child", "Follow-up Spec", "specs/spec_child.md", "spec_parent");
    expect(child.id).toBe("spec_child");
    expect(child.title).toBe("Follow-up Spec");
    expect(child.parent_spec_id).toBe("spec_parent");
    expect(child.status).toBe("draft");
  });

  test("throws if parent spec does not exist", () => {
    expect(() => createSpecFrom(db, "spec_child", "Child", "specs/child.md", "spec_nonexistent")).toThrow();
  });
});

describe("getSpecChildren", () => {
  test("returns empty array when no children", () => {
    createSpec(db, "spec_parent", "Parent", "specs/parent.md");
    const children = getSpecChildren(db, "spec_parent");
    expect(children).toHaveLength(0);
  });

  test("returns all direct children of a spec", () => {
    createSpec(db, "spec_parent", "Parent", "specs/parent.md");
    createSpecFrom(db, "spec_child1", "Child 1", "specs/child1.md", "spec_parent");
    createSpecFrom(db, "spec_child2", "Child 2", "specs/child2.md", "spec_parent");
    const children = getSpecChildren(db, "spec_parent");
    expect(children).toHaveLength(2);
    expect(children.map((c) => c.id).sort()).toEqual(["spec_child1", "spec_child2"]);
  });
});

describe("getSpecLineage", () => {
  test("returns single-element chain for spec with no parent", () => {
    createSpec(db, "spec_root", "Root", "specs/root.md");
    const chain = getSpecLineage(db, "spec_root");
    expect(chain).not.toBeNull();
    expect(chain!).toHaveLength(1);
    expect(chain![0].id).toBe("spec_root");
  });

  test("returns full ancestor chain: root → parent → child", () => {
    createSpec(db, "spec_root", "Root", "specs/root.md");
    createSpecFrom(db, "spec_mid", "Middle", "specs/mid.md", "spec_root");
    createSpecFrom(db, "spec_leaf", "Leaf", "specs/leaf.md", "spec_mid");
    const chain = getSpecLineage(db, "spec_leaf");
    expect(chain).not.toBeNull();
    expect(chain!).toHaveLength(3);
    // Chain should be ordered root-first
    expect(chain![0].id).toBe("spec_root");
    expect(chain![1].id).toBe("spec_mid");
    expect(chain![2].id).toBe("spec_leaf");
  });

  test("returns null for nonexistent spec", () => {
    const chain = getSpecLineage(db, "spec_nonexistent");
    expect(chain).toBeNull();
  });
});

describe("archiveSpec", () => {
  test("sets spec status to archived", () => {
    createSpec(db, "spec_001", "Test Spec", "specs/spec_001.md");
    archiveSpec(db, "spec_001");
    const spec = getSpec(db, "spec_001");
    expect(spec!.status).toBe("archived");
  });

  test("throws for nonexistent spec", () => {
    expect(() => archiveSpec(db, "spec_nonexistent")).toThrow();
  });

  test("works on draft specs", () => {
    createSpec(db, "spec_001", "Test", "specs/spec_001.md");
    archiveSpec(db, "spec_001");
    expect(getSpec(db, "spec_001")!.status).toBe("archived");
  });

  test("works on completed specs", () => {
    createSpec(db, "spec_001", "Test", "specs/spec_001.md");
    updateSpecStatus(db, "spec_001", "completed");
    archiveSpec(db, "spec_001");
    expect(getSpec(db, "spec_001")!.status).toBe("archived");
  });
});

describe("validateStatusTransition", () => {
  test("draft → building is valid", () => {
    const result = validateStatusTransition("draft", "building");
    expect(result.valid).toBe(true);
  });

  test("building → completed is valid", () => {
    const result = validateStatusTransition("building", "completed");
    expect(result.valid).toBe(true);
  });

  test("building → draft is valid (retry on failure)", () => {
    const result = validateStatusTransition("building", "draft");
    expect(result.valid).toBe(true);
  });

  test("completed → draft is invalid", () => {
    const result = validateStatusTransition("completed", "draft");
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  test("completed → building is invalid", () => {
    const result = validateStatusTransition("completed", "building");
    expect(result.valid).toBe(false);
  });

  test("archived → draft is invalid", () => {
    const result = validateStatusTransition("archived", "draft");
    expect(result.valid).toBe(false);
  });

  test("archived → building is invalid", () => {
    const result = validateStatusTransition("archived", "building");
    expect(result.valid).toBe(false);
  });

  test("draft → completed is invalid (must go through building)", () => {
    const result = validateStatusTransition("draft", "completed");
    expect(result.valid).toBe(false);
  });

  test("any status → archived is valid", () => {
    expect(validateStatusTransition("draft", "archived").valid).toBe(true);
    expect(validateStatusTransition("building", "archived").valid).toBe(true);
    expect(validateStatusTransition("completed", "archived").valid).toBe(true);
  });

  test("archived → archived is invalid (no-op)", () => {
    const result = validateStatusTransition("archived", "archived");
    expect(result.valid).toBe(false);
  });
});
