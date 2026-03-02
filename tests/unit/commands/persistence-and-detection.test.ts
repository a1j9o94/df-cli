import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

// Helper: create a temporary git repo with .df directory initialized
function createTestRepo(): string {
  const dir = join(tmpdir(), `df-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: "pipe" });
  execSync('git config user.name "Test"', { cwd: dir, stdio: "pipe" });

  // Create .df directory structure
  const dfDir = join(dir, ".df");
  mkdirSync(join(dfDir, "specs"), { recursive: true });
  mkdirSync(join(dfDir, "scenarios", "functional"), { recursive: true });
  mkdirSync(join(dfDir, "scenarios", "change"), { recursive: true });

  // Create an initial commit so git operations work
  writeFileSync(join(dir, ".gitignore"), "");
  execSync("git add .gitignore", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "initial"', { cwd: dir, stdio: "pipe" });

  return dir;
}

function cleanupTestRepo(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

function getGitLog(cwd: string): string {
  return execSync("git log --oneline", { cwd, encoding: "utf-8" }).trim();
}

function getLastCommitMessage(cwd: string): string {
  return execSync("git log -1 --format=%s", { cwd, encoding: "utf-8" }).trim();
}

function getLastCommitFiles(cwd: string): string[] {
  return execSync("git diff-tree --no-commit-id --name-only -r HEAD", { cwd, encoding: "utf-8" })
    .trim()
    .split("\n")
    .filter(Boolean);
}

function isFileTracked(cwd: string, filePath: string): boolean {
  try {
    execSync(`git ls-files --error-unmatch "${filePath}"`, { cwd, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Guard 5: Spec files committed immediately on creation
// ============================================================

describe("spec create git persistence", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestRepo();
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  test("spec create should git add and commit the spec file", async () => {
    const dfDir = join(testDir, ".df");
    const specId = "spec_test123";
    const specFile = `${specId}.md`;
    const specPath = join(dfDir, "specs", specFile);

    // Write a spec file (simulating what writeFileSync does in spec/create.ts)
    writeFileSync(specPath, "---\nid: spec_test123\ntitle: Test\n---\n# Test\n");

    // Import and call the git commit function
    const { gitCommitFile } = await import("../../../src/utils/git-persistence.js");
    gitCommitFile(testDir, join(".df", "specs", specFile), `df: track spec ${specId}`);

    // Verify the file is tracked in git
    expect(isFileTracked(testDir, join(".df", "specs", specFile))).toBe(true);

    // Verify a commit was made with the correct message
    const lastMsg = getLastCommitMessage(testDir);
    expect(lastMsg).toContain("spec_test123");

    // Verify the spec file is in the last commit
    const files = getLastCommitFiles(testDir);
    expect(files).toContain(join(".df", "specs", specFile));
  });

  test("spec create should not fail if not in a git repo", async () => {
    // Create a temp dir without git init
    const noGitDir = join(tmpdir(), `df-test-nogit-${randomUUID()}`);
    mkdirSync(join(noGitDir, ".df", "specs"), { recursive: true });
    const specFile = "spec_nogit.md";
    writeFileSync(join(noGitDir, ".df", "specs", specFile), "test content");

    const { gitCommitFile } = await import("../../../src/utils/git-persistence.js");

    // Should not throw — git commit is best-effort
    expect(() => {
      gitCommitFile(noGitDir, join(".df", "specs", specFile), "df: track spec");
    }).not.toThrow();

    cleanupTestRepo(noGitDir);
  });

  test("spec create should handle already-committed files gracefully", async () => {
    const dfDir = join(testDir, ".df");
    const specFile = "spec_dup.md";
    const specPath = join(dfDir, "specs", specFile);

    writeFileSync(specPath, "---\nid: spec_dup\n---\n");
    execSync(`git add "${join(".df", "specs", specFile)}"`, { cwd: testDir, stdio: "pipe" });
    execSync('git commit -m "pre-committed"', { cwd: testDir, stdio: "pipe" });

    const { gitCommitFile } = await import("../../../src/utils/git-persistence.js");

    // Calling again on an already-committed file with no changes should not fail
    expect(() => {
      gitCommitFile(testDir, join(".df", "specs", specFile), "df: track spec_dup");
    }).not.toThrow();
  });
});

// ============================================================
// Guard 5: Scenario files committed immediately on creation
// ============================================================

describe("scenario create git persistence", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestRepo();
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  test("scenario create should git add and commit the scenario file", async () => {
    const dfDir = join(testDir, ".df");
    const scenarioFile = join("scenarios", "functional", "test_scenario.md");
    const scenarioPath = join(dfDir, scenarioFile);

    writeFileSync(scenarioPath, "---\nname: test_scenario\ntype: functional\n---\nTest");

    const { gitCommitFile } = await import("../../../src/utils/git-persistence.js");
    gitCommitFile(testDir, join(".df", scenarioFile), "df: track scenario test_scenario");

    expect(isFileTracked(testDir, join(".df", scenarioFile))).toBe(true);

    const lastMsg = getLastCommitMessage(testDir);
    expect(lastMsg).toContain("test_scenario");

    const files = getLastCommitFiles(testDir);
    expect(files).toContain(join(".df", scenarioFile));
  });

  test("scenario create handles change type scenarios", async () => {
    const dfDir = join(testDir, ".df");
    const scenarioFile = join("scenarios", "change", "add_protected_path.md");
    const scenarioPath = join(dfDir, scenarioFile);

    writeFileSync(scenarioPath, "---\nname: add_protected_path\ntype: change\n---\nChange test");

    const { gitCommitFile } = await import("../../../src/utils/git-persistence.js");
    gitCommitFile(testDir, join(".df", scenarioFile), "df: track scenario add_protected_path");

    expect(isFileTracked(testDir, join(".df", scenarioFile))).toBe(true);
  });
});

// ============================================================
// Guard 4 (partial): Status DB corruption detection and restore
// ============================================================

describe("status DB corruption detection", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestRepo();
  });

  afterEach(() => {
    cleanupTestRepo(testDir);
  });

  test("detectDbCorruption returns false for a healthy DB", async () => {
    const dfDir = join(testDir, ".df");
    // Create a valid SQLite DB
    const { Database } = await import("bun:sqlite");
    const dbPath = join(dfDir, "state.db");
    const db = new Database(dbPath);
    db.exec("CREATE TABLE test (id TEXT)");
    db.close();

    const { detectDbCorruption } = await import("../../../src/utils/db-health.js");
    const result = detectDbCorruption(dfDir);

    expect(result.isCorrupt).toBe(false);
    expect(result.hasBackup).toBe(false);
  });

  test("detectDbCorruption returns true for missing DB", async () => {
    const dfDir = join(testDir, ".df");
    // No state.db file exists

    const { detectDbCorruption } = await import("../../../src/utils/db-health.js");
    const result = detectDbCorruption(dfDir);

    expect(result.isCorrupt).toBe(true);
    expect(result.error).toBeDefined();
  });

  test("detectDbCorruption returns true for corrupt DB", async () => {
    const dfDir = join(testDir, ".df");
    // Write garbage to state.db
    writeFileSync(join(dfDir, "state.db"), "this is not a sqlite database");

    const { detectDbCorruption } = await import("../../../src/utils/db-health.js");
    const result = detectDbCorruption(dfDir);

    expect(result.isCorrupt).toBe(true);
    expect(result.error).toBeDefined();
  });

  test("detectDbCorruption detects backup availability", async () => {
    const dfDir = join(testDir, ".df");
    // Write garbage to state.db
    writeFileSync(join(dfDir, "state.db"), "garbage");
    // Create a backup
    const { Database } = await import("bun:sqlite");
    const backupPath = join(dfDir, "state.db.backup");
    const backupDb = new Database(backupPath);
    backupDb.exec("CREATE TABLE test (id TEXT)");
    backupDb.close();

    const { detectDbCorruption } = await import("../../../src/utils/db-health.js");
    const result = detectDbCorruption(dfDir);

    expect(result.isCorrupt).toBe(true);
    expect(result.hasBackup).toBe(true);
  });

  test("restoreFromBackup restores DB from backup file", async () => {
    const dfDir = join(testDir, ".df");
    // Create a backup with known data
    const { Database } = await import("bun:sqlite");
    const backupPath = join(dfDir, "state.db.backup");
    const backupDb = new Database(backupPath);
    backupDb.exec("CREATE TABLE runs (id TEXT PRIMARY KEY, status TEXT)");
    backupDb.exec("INSERT INTO runs VALUES ('run_001', 'completed')");
    backupDb.close();

    // Write garbage to the real DB
    writeFileSync(join(dfDir, "state.db"), "corrupted");

    // Restore
    const { restoreStateDb } = await import("../../../src/utils/state-backup.js");
    const restored = restoreStateDb(dfDir);
    expect(restored).toBe(true);

    // Verify restored DB works
    const restoredDb = new Database(join(dfDir, "state.db"));
    const rows = restoredDb.query("SELECT * FROM runs").all();
    restoredDb.close();

    expect(rows).toHaveLength(1);
    expect((rows[0] as any).id).toBe("run_001");
  });

  test("restoreFromBackup returns false when no backup exists", async () => {
    const dfDir = join(testDir, ".df");
    writeFileSync(join(dfDir, "state.db"), "corrupted");

    const { restoreStateDb } = await import("../../../src/utils/state-backup.js");
    const restored = restoreStateDb(dfDir);
    expect(restored).toBe(false);
  });
});
