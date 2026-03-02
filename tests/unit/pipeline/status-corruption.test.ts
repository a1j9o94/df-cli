import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { isDbCorrupt, hasBackup, backupStateDb } from "../../../src/pipeline/state-db-backup.js";
import { checkDbHealth } from "../../../src/pipeline/db-health.js";

let dfDir: string;

beforeEach(() => {
  dfDir = mkdtempSync(join(tmpdir(), "df-status-corrupt-"));
});

afterEach(() => {
  try {
    rmSync(dfDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("checkDbHealth", () => {
  test("returns healthy when state.db has valid SQLite header", () => {
    writeFileSync(join(dfDir, "state.db"), "SQLite format 3\x00" + "x".repeat(100));
    const result = checkDbHealth(dfDir);
    expect(result.healthy).toBe(true);
    expect(result.corrupt).toBe(false);
    expect(result.backupAvailable).toBe(false);
  });

  test("returns corrupt when state.db is missing", () => {
    const result = checkDbHealth(dfDir);
    expect(result.healthy).toBe(false);
    expect(result.corrupt).toBe(true);
  });

  test("returns corrupt when state.db is empty", () => {
    writeFileSync(join(dfDir, "state.db"), "");
    const result = checkDbHealth(dfDir);
    expect(result.healthy).toBe(false);
    expect(result.corrupt).toBe(true);
  });

  test("returns corrupt when state.db has non-SQLite content", () => {
    writeFileSync(join(dfDir, "state.db"), "this is not a sqlite db");
    const result = checkDbHealth(dfDir);
    expect(result.healthy).toBe(false);
    expect(result.corrupt).toBe(true);
  });

  test("detects available backup when it exists", () => {
    writeFileSync(join(dfDir, "state.db"), "corrupted");
    writeFileSync(join(dfDir, "state.db.backup"), "SQLite format 3\x00good data");
    const result = checkDbHealth(dfDir);
    expect(result.corrupt).toBe(true);
    expect(result.backupAvailable).toBe(true);
  });

  test("reports no backup when none exists", () => {
    writeFileSync(join(dfDir, "state.db"), "corrupted");
    const result = checkDbHealth(dfDir);
    expect(result.corrupt).toBe(true);
    expect(result.backupAvailable).toBe(false);
  });

  test("produces actionable message for corrupt DB with backup", () => {
    writeFileSync(join(dfDir, "state.db"), "corrupted");
    writeFileSync(join(dfDir, "state.db.backup"), "SQLite format 3\x00good data");
    const result = checkDbHealth(dfDir);
    expect(result.message).toContain("corrupt");
    expect(result.message).toContain("restore");
  });

  test("produces actionable message for corrupt DB without backup", () => {
    writeFileSync(join(dfDir, "state.db"), "corrupted");
    const result = checkDbHealth(dfDir);
    expect(result.message).toContain("corrupt");
    expect(result.message).toContain("reinitialize");
  });

  test("produces no error message for healthy DB", () => {
    writeFileSync(join(dfDir, "state.db"), "SQLite format 3\x00" + "x".repeat(100));
    const result = checkDbHealth(dfDir);
    expect(result.message).toBe("");
  });
});
