import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractFileContents, formatPreloadedFiles } from "../../src/pipeline/file-preload.js";

// ============================================================
// Test fixtures — temp directory with sample files
// ============================================================
const TEST_DIR = join(import.meta.dir, "__fixtures__", "file-preload");

function createTestFile(relativePath: string, content: string): string {
  const fullPath = join(TEST_DIR, relativePath);
  const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, content);
  return fullPath;
}

function generateLines(count: number, prefix = "line"): string {
  return Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}: content here`).join("\n");
}

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

// ============================================================
// extractFileContents — core extraction logic
// ============================================================
describe("extractFileContents", () => {
  test("returns empty array when scope has no modifies", () => {
    const result = extractFileContents({ creates: [], modifies: [], test_files: [] }, TEST_DIR);
    expect(result).toEqual([]);
  });

  test("returns full file content for files <= 200 lines", () => {
    const content = generateLines(50);
    const filePath = "src/small-file.ts";
    createTestFile(filePath, content);

    const result = extractFileContents(
      { creates: [], modifies: [filePath], test_files: [] },
      TEST_DIR,
    );

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe(filePath);
    expect(result[0].content).toBe(content);
    expect(result[0].truncated).toBe(false);
  });

  test("returns full file content for files exactly at 200 lines", () => {
    const content = generateLines(200);
    const filePath = "src/boundary-file.ts";
    createTestFile(filePath, content);

    const result = extractFileContents(
      { creates: [], modifies: [filePath], test_files: [] },
      TEST_DIR,
    );

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(content);
    expect(result[0].truncated).toBe(false);
  });

  test("truncates files over 200 lines with context markers", () => {
    const content = generateLines(300);
    const filePath = "src/large-file.ts";
    createTestFile(filePath, content);

    const result = extractFileContents(
      { creates: [], modifies: [filePath], test_files: [] },
      TEST_DIR,
    );

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe(filePath);
    expect(result[0].truncated).toBe(true);
    // Should contain omission markers
    expect(result[0].content).toContain("// ... (lines");
    expect(result[0].content).toContain("omitted)");
  });

  test("handles multiple files in modifies array", () => {
    createTestFile("src/a.ts", generateLines(10));
    createTestFile("src/b.ts", generateLines(20));

    const result = extractFileContents(
      { creates: [], modifies: ["src/a.ts", "src/b.ts"], test_files: [] },
      TEST_DIR,
    );

    expect(result).toHaveLength(2);
    expect(result[0].path).toBe("src/a.ts");
    expect(result[1].path).toBe("src/b.ts");
  });

  test("gracefully handles missing files", () => {
    const result = extractFileContents(
      { creates: [], modifies: ["src/nonexistent.ts"], test_files: [] },
      TEST_DIR,
    );

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/nonexistent.ts");
    expect(result[0].error).toBeDefined();
    expect(result[0].content).toBe("");
  });

  test("preserves order of modifies array in output", () => {
    createTestFile("src/z.ts", "z content");
    createTestFile("src/a.ts", "a content");
    createTestFile("src/m.ts", "m content");

    const result = extractFileContents(
      { creates: [], modifies: ["src/z.ts", "src/a.ts", "src/m.ts"], test_files: [] },
      TEST_DIR,
    );

    expect(result[0].path).toBe("src/z.ts");
    expect(result[1].path).toBe("src/a.ts");
    expect(result[2].path).toBe("src/m.ts");
  });

  test("handles empty files", () => {
    createTestFile("src/empty.ts", "");

    const result = extractFileContents(
      { creates: [], modifies: ["src/empty.ts"], test_files: [] },
      TEST_DIR,
    );

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("");
    expect(result[0].truncated).toBe(false);
  });

  test("for files > 200 lines, includes first and last portions with context", () => {
    const content = generateLines(500);
    const filePath = "src/very-large-file.ts";
    createTestFile(filePath, content);

    const result = extractFileContents(
      { creates: [], modifies: [filePath], test_files: [] },
      TEST_DIR,
    );

    expect(result).toHaveLength(1);
    // Should include the beginning of the file
    expect(result[0].content).toContain("line 1:");
    // Should include the end of the file
    expect(result[0].content).toContain("line 500:");
    expect(result[0].truncated).toBe(true);
  });
});

// ============================================================
// formatPreloadedFiles — convert to builder-instruction markdown
// ============================================================
describe("formatPreloadedFiles", () => {
  test("returns empty string when no files", () => {
    const result = formatPreloadedFiles([]);
    expect(result).toBe("");
  });

  test("formats a single file with correct markdown structure", () => {
    const result = formatPreloadedFiles([
      { path: "src/engine.ts", content: "const x = 1;", truncated: false },
    ]);

    expect(result).toContain("### Pre-loaded File: src/engine.ts");
    expect(result).toContain("```ts");
    expect(result).toContain("const x = 1;");
    expect(result).toContain("```");
  });

  test("formats multiple files in order", () => {
    const result = formatPreloadedFiles([
      { path: "src/a.ts", content: "a content", truncated: false },
      { path: "src/b.ts", content: "b content", truncated: false },
    ]);

    const aIndex = result.indexOf("### Pre-loaded File: src/a.ts");
    const bIndex = result.indexOf("### Pre-loaded File: src/b.ts");
    expect(aIndex).toBeGreaterThanOrEqual(0);
    expect(bIndex).toBeGreaterThan(aIndex);
  });

  test("uses correct language identifier based on file extension", () => {
    const result = formatPreloadedFiles([
      { path: "src/module.ts", content: "ts content", truncated: false },
    ]);
    expect(result).toContain("```ts");

    const jsResult = formatPreloadedFiles([
      { path: "src/module.js", content: "js content", truncated: false },
    ]);
    expect(jsResult).toContain("```js");

    const pyResult = formatPreloadedFiles([
      { path: "src/module.py", content: "py content", truncated: false },
    ]);
    expect(pyResult).toContain("```py");
  });

  test("handles files with errors", () => {
    const result = formatPreloadedFiles([
      { path: "src/missing.ts", content: "", truncated: false, error: "File not found" },
    ]);

    expect(result).toContain("### Pre-loaded File: src/missing.ts");
    expect(result).toContain("File not found");
  });

  test("includes truncation notice for truncated files", () => {
    const result = formatPreloadedFiles([
      { path: "src/large.ts", content: "some content", truncated: true },
    ]);

    expect(result).toContain("(truncated");
  });
});
