import { describe, test, expect, beforeEach, mock, afterEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createSpec, getSpec } from "../../../src/db/queries/specs.js";
import { getSpecChildren } from "../../../src/db/queries/spec-lineage.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rmSync } from "node:fs";

// Import the function we'll test
import { executeSpecCreateFrom } from "../../../src/commands/spec/create-from.js";

let db: SqliteDb;
let tmpDir: string;
let dfDir: string;
let specsDir: string;

beforeEach(() => {
  db = getDbForTest();
  tmpDir = mkdtempSync(join(tmpdir(), "spec-create-from-"));
  dfDir = join(tmpDir, ".df");
  specsDir = join(dfDir, "specs");
  mkdirSync(specsDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("executeSpecCreateFrom", () => {
  test("creates a new spec derived from parent with copied content", () => {
    // Create parent spec in DB and on disk
    const parentId = "spec_PARENT001";
    createSpec(db, parentId, "Original Auth Spec", `specs/${parentId}.md`);
    const parentContent = `---
id: ${parentId}
title: Original Auth Spec
type: feature
status: completed
version: "0.1.0"
priority: high
---

# Original Auth Spec

## Goal

Implement JWT authentication.

## Requirements

- JWT token generation
- Token validation middleware
`;
    writeFileSync(join(dfDir, `specs/${parentId}.md`), parentContent);

    // Execute create-from
    const result = executeSpecCreateFrom(db, dfDir, "Follow-up: Auth improvements", parentId);

    // Verify the new spec was created in DB
    expect(result.id).toBeDefined();
    expect(result.title).toBe("Follow-up: Auth improvements");
    expect(result.parent_spec_id).toBe(parentId);
    expect(result.status).toBe("draft");

    // Verify file was written on disk
    const newFilePath = join(dfDir, result.file_path);
    expect(existsSync(newFilePath)).toBe(true);

    // Verify content was copied and frontmatter updated
    const newContent = readFileSync(newFilePath, "utf-8");
    expect(newContent).toContain("Follow-up: Auth improvements");
    expect(newContent).toContain(result.id);
    expect(newContent).toContain("parent_spec_id");
    expect(newContent).toContain(parentId);
    expect(newContent).toContain("draft"); // New spec starts as draft
    // Body content from parent should be present
    expect(newContent).toContain("Implement JWT authentication");
  });

  test("preserves parent body content in new spec", () => {
    const parentId = "spec_PARENTBODY";
    createSpec(db, parentId, "Body Test", `specs/${parentId}.md`);
    const parentContent = `---
id: ${parentId}
title: Body Test
type: feature
status: draft
version: "0.1.0"
priority: medium
---

# Body Test

Custom body content that should be copied.
`;
    writeFileSync(join(dfDir, `specs/${parentId}.md`), parentContent);

    const result = executeSpecCreateFrom(db, dfDir, "Child of body test", parentId);
    const newContent = readFileSync(join(dfDir, result.file_path), "utf-8");
    expect(newContent).toContain("Custom body content that should be copied");
  });

  test("throws if parent spec does not exist in DB", () => {
    expect(() =>
      executeSpecCreateFrom(db, dfDir, "Child", "spec_NONEXISTENT"),
    ).toThrow("not found");
  });

  test("throws if parent spec file does not exist on disk", () => {
    createSpec(db, "spec_NOFILE", "No File", "specs/spec_NOFILE.md");
    // Don't create the file on disk
    expect(() =>
      executeSpecCreateFrom(db, dfDir, "Child", "spec_NOFILE"),
    ).toThrow();
  });

  test("new spec appears as child of parent in getSpecChildren", () => {
    const parentId = "spec_LINEAGE01";
    createSpec(db, parentId, "Parent", `specs/${parentId}.md`);
    writeFileSync(
      join(dfDir, `specs/${parentId}.md`),
      `---\nid: ${parentId}\ntitle: Parent\ntype: feature\nstatus: draft\nversion: "0.1.0"\npriority: medium\n---\n\n# Parent\n`,
    );

    const result = executeSpecCreateFrom(db, dfDir, "Child Spec", parentId);
    const children = getSpecChildren(db, parentId);
    expect(children).toHaveLength(1);
    expect(children[0].id).toBe(result.id);
  });
});
