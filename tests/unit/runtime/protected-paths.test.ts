import { describe, test, expect } from "bun:test";
import {
  PROTECTED_PATTERNS,
  generateWorktreeGitignore,
  isProtectedPath,
  filterProtectedFiles,
  getProtectedFiles,
} from "../../../src/runtime/protected-paths.js";

describe("PROTECTED_PATTERNS", () => {
  test("includes state.db and WAL/SHM files", () => {
    expect(PROTECTED_PATTERNS).toContain(".df/state.db");
    expect(PROTECTED_PATTERNS).toContain(".df/state.db-shm");
    expect(PROTECTED_PATTERNS).toContain(".df/state.db-wal");
  });

  test("includes state.db-journal for rollback journal", () => {
    expect(PROTECTED_PATTERNS).toContain(".df/state.db-journal");
  });

  test("includes state.db.backup", () => {
    expect(PROTECTED_PATTERNS).toContain(".df/state.db.backup");
  });

  test("includes .df/worktrees/ directory", () => {
    expect(PROTECTED_PATTERNS).toContain(".df/worktrees/");
  });

  test("includes .df/logs/ directory", () => {
    expect(PROTECTED_PATTERNS).toContain(".df/logs/");
  });

  test("includes .claude/ directory", () => {
    expect(PROTECTED_PATTERNS).toContain(".claude/");
  });

  test("includes .letta/ directory", () => {
    expect(PROTECTED_PATTERNS).toContain(".letta/");
  });

  test("is frozen/readonly array", () => {
    expect(() => {
      (PROTECTED_PATTERNS as string[]).push("hacked");
    }).toThrow();
  });
});

describe("generateWorktreeGitignore", () => {
  test("generates valid .gitignore content", () => {
    const content = generateWorktreeGitignore();
    expect(content).toBeTypeOf("string");
    expect(content.length).toBeGreaterThan(0);
  });

  test("includes all protected patterns", () => {
    const content = generateWorktreeGitignore();
    for (const pattern of PROTECTED_PATTERNS) {
      expect(content).toContain(pattern);
    }
  });

  test("includes auto-generated header comment", () => {
    const content = generateWorktreeGitignore();
    expect(content).toContain("auto-generated");
    expect(content).toContain("DO NOT EDIT");
  });

  test("each pattern is on its own line", () => {
    const content = generateWorktreeGitignore();
    const lines = content.split("\n");
    for (const pattern of PROTECTED_PATTERNS) {
      expect(lines).toContain(pattern);
    }
  });
});

describe("isProtectedPath", () => {
  test("matches exact state.db files", () => {
    expect(isProtectedPath(".df/state.db")).toBe(true);
    expect(isProtectedPath(".df/state.db-shm")).toBe(true);
    expect(isProtectedPath(".df/state.db-wal")).toBe(true);
    expect(isProtectedPath(".df/state.db-journal")).toBe(true);
    expect(isProtectedPath(".df/state.db.backup")).toBe(true);
  });

  test("matches files inside protected directories", () => {
    expect(isProtectedPath(".df/worktrees/some-branch")).toBe(true);
    expect(isProtectedPath(".df/logs/run.log")).toBe(true);
    expect(isProtectedPath(".claude/settings.json")).toBe(true);
    expect(isProtectedPath(".claude/CLAUDE.md")).toBe(true);
    expect(isProtectedPath(".letta/sync.json")).toBe(true);
  });

  test("matches directory paths themselves", () => {
    expect(isProtectedPath(".df/worktrees")).toBe(true);
    expect(isProtectedPath(".df/logs")).toBe(true);
    expect(isProtectedPath(".claude")).toBe(true);
    expect(isProtectedPath(".letta")).toBe(true);
  });

  test("does not match normal project files", () => {
    expect(isProtectedPath("src/index.ts")).toBe(false);
    expect(isProtectedPath("package.json")).toBe(false);
    expect(isProtectedPath("tests/unit/test.ts")).toBe(false);
    expect(isProtectedPath(".df/specs/spec_123.md")).toBe(false);
    expect(isProtectedPath(".df/config.yaml")).toBe(false);
    expect(isProtectedPath(".df/pipeline.yaml")).toBe(false);
  });

  test("does not match .df/scenarios", () => {
    expect(isProtectedPath(".df/scenarios/functional/test.md")).toBe(false);
  });

  test("normalizes backslashes to forward slashes", () => {
    expect(isProtectedPath(".df\\state.db")).toBe(true);
    expect(isProtectedPath(".claude\\settings.json")).toBe(true);
  });
});

describe("filterProtectedFiles", () => {
  test("removes protected files from list", () => {
    const files = [
      "src/index.ts",
      ".df/state.db-shm",
      "package.json",
      ".claude/settings.json",
      ".df/state.db-wal",
    ];

    const result = filterProtectedFiles(files);
    expect(result).toEqual(["src/index.ts", "package.json"]);
  });

  test("returns empty array when all files are protected", () => {
    const files = [".df/state.db", ".df/state.db-shm", ".claude/foo"];
    expect(filterProtectedFiles(files)).toEqual([]);
  });

  test("returns all files when none are protected", () => {
    const files = ["src/a.ts", "src/b.ts", "README.md"];
    expect(filterProtectedFiles(files)).toEqual(files);
  });

  test("handles empty input", () => {
    expect(filterProtectedFiles([])).toEqual([]);
  });
});

describe("getProtectedFiles", () => {
  test("returns only protected files from list", () => {
    const files = [
      "src/index.ts",
      ".df/state.db-shm",
      "package.json",
      ".claude/settings.json",
    ];

    const result = getProtectedFiles(files);
    expect(result).toEqual([".df/state.db-shm", ".claude/settings.json"]);
  });

  test("returns empty array when no files are protected", () => {
    const files = ["src/a.ts", "src/b.ts"];
    expect(getProtectedFiles(files)).toEqual([]);
  });
});
