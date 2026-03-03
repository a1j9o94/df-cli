import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createSpec, updateSpecStatus } from "../../../src/db/queries/specs.js";
import { createSpecFrom } from "../../../src/db/queries/spec-lineage.js";
import { formatSpecHistory } from "../../../src/commands/spec/history.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("formatSpecHistory", () => {
  test("formats single spec with no lineage", () => {
    createSpec(db, "spec_001", "Root Spec", "specs/spec_001.md");
    const output = formatSpecHistory(db, "spec_001");
    expect(output).toContain("spec_001");
    expect(output).toContain("Root Spec");
    expect(output).toContain("draft");
  });

  test("formats full lineage chain with arrows", () => {
    createSpec(db, "spec_A", "First Spec", "specs/spec_A.md");
    updateSpecStatus(db, "spec_A", "completed");
    createSpecFrom(db, "spec_B", "Second Spec", "specs/spec_B.md", "spec_A");
    updateSpecStatus(db, "spec_B", "completed");
    createSpecFrom(db, "spec_C", "Third Spec", "specs/spec_C.md", "spec_B");

    const output = formatSpecHistory(db, "spec_C");

    // Should contain all three specs
    expect(output).toContain("spec_A");
    expect(output).toContain("First Spec");
    expect(output).toContain("spec_B");
    expect(output).toContain("Second Spec");
    expect(output).toContain("spec_C");
    expect(output).toContain("Third Spec");

    // Should show relationship arrows
    expect(output).toContain("→");
  });

  test("shows history from any node in the chain", () => {
    createSpec(db, "spec_root", "Root", "specs/root.md");
    createSpecFrom(db, "spec_mid", "Mid", "specs/mid.md", "spec_root");
    createSpecFrom(db, "spec_leaf", "Leaf", "specs/leaf.md", "spec_mid");

    // Querying from root should show root
    const rootOutput = formatSpecHistory(db, "spec_root");
    expect(rootOutput).toContain("spec_root");

    // Querying from leaf should show full chain
    const leafOutput = formatSpecHistory(db, "spec_leaf");
    expect(leafOutput).toContain("spec_root");
    expect(leafOutput).toContain("spec_mid");
    expect(leafOutput).toContain("spec_leaf");
  });

  test("returns error message for nonexistent spec", () => {
    const output = formatSpecHistory(db, "spec_NONEXISTENT");
    expect(output).toContain("not found");
  });

  test("formats JSON output when requested", () => {
    createSpec(db, "spec_001", "Root", "specs/spec_001.md");
    createSpecFrom(db, "spec_002", "Child", "specs/spec_002.md", "spec_001");

    const output = formatSpecHistory(db, "spec_002", { json: true });
    const parsed = JSON.parse(output);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe("spec_001");
    expect(parsed[1].id).toBe("spec_002");
  });
});
