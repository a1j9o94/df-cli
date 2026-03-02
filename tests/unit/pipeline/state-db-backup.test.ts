import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  backupStateDb,
  restoreStateDb,
  removeBackup,
  hasBackup,
  isDbCorrupt,
} from "../../../src/pipeline/state-db-backup.js";

let dfDir: string;

beforeEach(() => {
  dfDir = mkdtempSync(join(tmpdir(), "df-backup-test-"));
  // Create a fake state.db
  writeFileSync(join(dfDir, "state.db"), "SQLite format 3\x00some valid-looking data");
});

afterEach(() => {
  try {
    rmSync(dfDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("backupStateDb", () => {
  test("creates backup file as state.db.backup", () => {
    const result = backupStateDb(dfDir);
    expect(result.success).toBe(true);
    expect(existsSync(join(dfDir, "state.db.backup"))).toBe(true);
  });

  test("backup contains same content as original", () => {
    backupStateDb(dfDir);
    const original = readFileSync(join(dfDir, "state.db"));
    const backup = readFileSync(join(dfDir, "state.db.backup"));
    expect(original.equals(backup)).toBe(true);
  });

  test("returns failure when state.db does not exist", () => {
    rmSync(join(dfDir, "state.db"));
    const result = backupStateDb(dfDir);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("overwrites existing backup", () => {
    writeFileSync(join(dfDir, "state.db.backup"), "old backup");
    backupStateDb(dfDir);
    const backup = readFileSync(join(dfDir, "state.db.backup"), "utf-8");
    expect(backup).not.toBe("old backup");
  });
});

describe("restoreStateDb", () => {
  test("restores state.db from backup", () => {
    // Create backup
    backupStateDb(dfDir);

    // Corrupt the original
    writeFileSync(join(dfDir, "state.db"), "corrupted data");

    // Restore
    const result = restoreStateDb(dfDir);
    expect(result.success).toBe(true);

    // Verify restored content matches original
    const restored = readFileSync(join(dfDir, "state.db"), "utf-8");
    expect(restored).toContain("SQLite format 3");
  });

  test("returns failure when no backup exists", () => {
    const result = restoreStateDb(dfDir);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("removeBackup", () => {
  test("removes the backup file", () => {
    backupStateDb(dfDir);
    expect(existsSync(join(dfDir, "state.db.backup"))).toBe(true);

    removeBackup(dfDir);
    expect(existsSync(join(dfDir, "state.db.backup"))).toBe(false);
  });

  test("does not throw when backup does not exist", () => {
    expect(() => removeBackup(dfDir)).not.toThrow();
  });
});

describe("hasBackup", () => {
  test("returns true when backup exists", () => {
    backupStateDb(dfDir);
    expect(hasBackup(dfDir)).toBe(true);
  });

  test("returns false when no backup exists", () => {
    expect(hasBackup(dfDir)).toBe(false);
  });
});

describe("isDbCorrupt", () => {
  test("returns false for valid SQLite header", () => {
    writeFileSync(join(dfDir, "state.db"), "SQLite format 3\x00" + "x".repeat(100));
    expect(isDbCorrupt(dfDir)).toBe(false);
  });

  test("returns true for missing state.db", () => {
    rmSync(join(dfDir, "state.db"));
    expect(isDbCorrupt(dfDir)).toBe(true);
  });

  test("returns true for empty state.db", () => {
    writeFileSync(join(dfDir, "state.db"), "");
    expect(isDbCorrupt(dfDir)).toBe(true);
  });

  test("returns true for non-SQLite content", () => {
    writeFileSync(join(dfDir, "state.db"), "not a sqlite database");
    expect(isDbCorrupt(dfDir)).toBe(true);
  });
});
