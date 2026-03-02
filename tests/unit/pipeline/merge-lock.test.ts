import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Import the module we're about to create
import {
  acquireMergeLock,
  releaseMergeLock,
  waitForMergeLock,
  getMergeLockInfo,
  type MergeLockInfo,
} from "../../../src/pipeline/merge-lock.js";

let dfDir: string;

beforeEach(() => {
  dfDir = mkdtempSync(join(tmpdir(), "df-merge-lock-test-"));
});

afterEach(() => {
  try {
    rmSync(dfDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

describe("acquireMergeLock", () => {
  test("acquires lock when no lock exists", () => {
    const acquired = acquireMergeLock(dfDir, "run-1");
    expect(acquired).toBe(true);
    expect(existsSync(join(dfDir, "merge.lock"))).toBe(true);
  });

  test("lock file contains correct JSON", () => {
    acquireMergeLock(dfDir, "run-1");
    const content = JSON.parse(readFileSync(join(dfDir, "merge.lock"), "utf-8"));
    expect(content.runId).toBe("run-1");
    expect(content.pid).toBe(process.pid);
    expect(typeof content.acquiredAt).toBe("string");
  });

  test("fails to acquire when lock already held by another run", () => {
    acquireMergeLock(dfDir, "run-1");
    const acquired = acquireMergeLock(dfDir, "run-2");
    expect(acquired).toBe(false);
  });

  test("succeeds if same run re-acquires (idempotent)", () => {
    acquireMergeLock(dfDir, "run-1");
    const acquired = acquireMergeLock(dfDir, "run-1");
    expect(acquired).toBe(true);
  });

  test("steals stale lock (dead PID)", () => {
    // Write a lock with a PID that's definitely dead
    const staleLock: MergeLockInfo = {
      runId: "old-run",
      acquiredAt: new Date().toISOString(),
      pid: 999999999, // PID that almost certainly doesn't exist
    };
    writeFileSync(join(dfDir, "merge.lock"), JSON.stringify(staleLock));

    const acquired = acquireMergeLock(dfDir, "run-2");
    expect(acquired).toBe(true);

    const content = JSON.parse(readFileSync(join(dfDir, "merge.lock"), "utf-8"));
    expect(content.runId).toBe("run-2");
  });
});

describe("releaseMergeLock", () => {
  test("removes lock file when owned by this run", () => {
    acquireMergeLock(dfDir, "run-1");
    releaseMergeLock(dfDir, "run-1");
    expect(existsSync(join(dfDir, "merge.lock"))).toBe(false);
  });

  test("does not remove lock owned by another run", () => {
    acquireMergeLock(dfDir, "run-1");
    releaseMergeLock(dfDir, "run-2"); // different run
    expect(existsSync(join(dfDir, "merge.lock"))).toBe(true);
  });

  test("no-op when lock file does not exist", () => {
    // Should not throw
    releaseMergeLock(dfDir, "run-1");
  });
});

describe("getMergeLockInfo", () => {
  test("returns null when no lock exists", () => {
    const info = getMergeLockInfo(dfDir);
    expect(info).toBeNull();
  });

  test("returns lock info when lock exists", () => {
    acquireMergeLock(dfDir, "run-1");
    const info = getMergeLockInfo(dfDir);
    expect(info).not.toBeNull();
    expect(info!.runId).toBe("run-1");
    expect(info!.pid).toBe(process.pid);
  });

  test("returns null for corrupt lock file", () => {
    writeFileSync(join(dfDir, "merge.lock"), "not json");
    const info = getMergeLockInfo(dfDir);
    expect(info).toBeNull();
  });
});

describe("waitForMergeLock", () => {
  test("resolves immediately when lock is free", async () => {
    await waitForMergeLock(dfDir, "run-1", 5000);
    // Should have acquired the lock
    const info = getMergeLockInfo(dfDir);
    expect(info).not.toBeNull();
    expect(info!.runId).toBe("run-1");
  });

  test("times out when lock is held by a live process", async () => {
    // Acquire with our own PID (which is alive) under a different run
    acquireMergeLock(dfDir, "run-1");

    // Try to wait — should timeout since PID is alive
    await expect(
      waitForMergeLock(dfDir, "run-2", 200, 50)
    ).rejects.toThrow(/timeout/i);
  });

  test("acquires after stale lock detected during wait", async () => {
    // Write a stale lock
    const staleLock: MergeLockInfo = {
      runId: "dead-run",
      acquiredAt: new Date().toISOString(),
      pid: 999999999,
    };
    writeFileSync(join(dfDir, "merge.lock"), JSON.stringify(staleLock));

    // Should detect stale lock and steal it
    await waitForMergeLock(dfDir, "run-2", 5000, 50);
    const info = getMergeLockInfo(dfDir);
    expect(info!.runId).toBe("run-2");
  });
});
