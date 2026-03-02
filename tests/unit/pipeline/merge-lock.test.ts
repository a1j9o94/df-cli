import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  acquireMergeLock,
  releaseMergeLock,
  getMergeLockInfo,
  waitForMergeLock,
  getMergeQueuePosition,
  type MergeLockInfo,
} from "../../../src/pipeline/merge-lock.js";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun, updateRunPhase, updateRunStatus } from "../../../src/db/queries/runs.js";
import type { SqliteDb } from "../../../src/db/index.js";

let dfDir: string;

beforeEach(() => {
  // Create a fresh temp directory to act as .df dir
  dfDir = mkdtempSync(join(tmpdir(), "merge-lock-test-"));
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
    const result = acquireMergeLock(dfDir, "run_001");
    expect(result).toBe(true);
    expect(existsSync(join(dfDir, "merge.lock"))).toBe(true);
  });

  test("creates lock file with correct format", () => {
    acquireMergeLock(dfDir, "run_001");
    const lockPath = join(dfDir, "merge.lock");
    expect(existsSync(lockPath)).toBe(true);

    const content = JSON.parse(readFileSync(lockPath, "utf-8"));
    expect(content.runId).toBe("run_001");
    expect(content.pid).toBe(process.pid);
    expect(typeof content.acquiredAt).toBe("string");
    // Validate ISO date format
    expect(new Date(content.acquiredAt).toISOString()).toBe(content.acquiredAt);
  });

  test("returns false when lock already held by another run", () => {
    acquireMergeLock(dfDir, "run_001");
    const result = acquireMergeLock(dfDir, "run_002");
    expect(result).toBe(false);
  });

  test("returns true when same run re-acquires (idempotent)", () => {
    acquireMergeLock(dfDir, "run_001");
    const result = acquireMergeLock(dfDir, "run_001");
    expect(result).toBe(true);
  });

  test("lock file conforms to MergeLockFileFormat schema", () => {
    acquireMergeLock(dfDir, "run_abc");
    const lockPath = join(dfDir, "merge.lock");
    const content = JSON.parse(readFileSync(lockPath, "utf-8"));

    // Must have exactly these keys and no others (additionalProperties: false)
    const keys = Object.keys(content).sort();
    expect(keys).toEqual(["acquiredAt", "pid", "runId"]);

    // Type checks matching the JSON schema
    expect(typeof content.runId).toBe("string");
    expect(typeof content.acquiredAt).toBe("string");
    expect(Number.isInteger(content.pid)).toBe(true);
  });
});

describe("releaseMergeLock", () => {
  test("removes lock file when run matches", () => {
    acquireMergeLock(dfDir, "run_001");
    releaseMergeLock(dfDir, "run_001");
    const lockPath = join(dfDir, "merge.lock");
    expect(existsSync(lockPath)).toBe(false);
  });

  test("does not remove lock file when run does not match", () => {
    acquireMergeLock(dfDir, "run_001");
    releaseMergeLock(dfDir, "run_002");
    const lockPath = join(dfDir, "merge.lock");
    expect(existsSync(lockPath)).toBe(true);
  });

  test("does nothing when no lock exists", () => {
    // Should not throw
    releaseMergeLock(dfDir, "run_001");
  });
});

describe("getMergeLockInfo", () => {
  test("returns null when no lock exists", () => {
    const info = getMergeLockInfo(dfDir);
    expect(info).toBeNull();
  });

  test("returns lock info when lock exists", () => {
    acquireMergeLock(dfDir, "run_001");
    const info = getMergeLockInfo(dfDir);
    expect(info).not.toBeNull();
    expect(info!.runId).toBe("run_001");
    expect(info!.pid).toBe(process.pid);
    expect(typeof info!.acquiredAt).toBe("string");
  });

  test("returns null for corrupted lock file", () => {
    const lockPath = join(dfDir, "merge.lock");
    writeFileSync(lockPath, "not valid json");
    const info = getMergeLockInfo(dfDir);
    expect(info).toBeNull();
  });
});

describe("stale lock detection", () => {
  test("acquires lock when existing lock has dead PID", () => {
    // Write a lock with a PID that doesn't exist
    const lockPath = join(dfDir, "merge.lock");
    const staleLock: MergeLockInfo = {
      runId: "run_stale",
      acquiredAt: new Date().toISOString(),
      pid: 999999999, // PID that almost certainly doesn't exist
    };
    writeFileSync(lockPath, JSON.stringify(staleLock));

    const result = acquireMergeLock(dfDir, "run_new");
    expect(result).toBe(true);

    // Verify new lock is written
    const info = getMergeLockInfo(dfDir);
    expect(info!.runId).toBe("run_new");
    expect(info!.pid).toBe(process.pid);
  });

  test("does not steal lock when PID is alive", () => {
    // Write a lock with our own PID (which is definitely alive)
    const lockPath = join(dfDir, "merge.lock");
    const activeLock: MergeLockInfo = {
      runId: "run_active",
      acquiredAt: new Date().toISOString(),
      pid: process.pid,
    };
    writeFileSync(lockPath, JSON.stringify(activeLock));

    const result = acquireMergeLock(dfDir, "run_new");
    expect(result).toBe(false);
  });
});

describe("waitForMergeLock", () => {
  test("resolves immediately when lock is available", async () => {
    const start = Date.now();
    await waitForMergeLock(dfDir, "run_001", 5000);
    const elapsed = Date.now() - start;

    // Should resolve almost instantly (< 100ms)
    expect(elapsed).toBeLessThan(100);

    // Lock should be acquired
    const info = getMergeLockInfo(dfDir);
    expect(info!.runId).toBe("run_001");
  });

  test("throws on timeout when lock is held", async () => {
    // Acquire lock with our own PID (alive), different run
    acquireMergeLock(dfDir, "run_holder");

    // Try to wait with very short timeout and poll interval
    await expect(
      waitForMergeLock(dfDir, "run_waiter", 200, 50)
    ).rejects.toThrow(/timeout/i);
  });

  test("acquires after stale lock detected during wait", async () => {
    // Write a stale lock (dead PID)
    const lockPath = join(dfDir, "merge.lock");
    const staleLock: MergeLockInfo = {
      runId: "run_stale",
      acquiredAt: new Date().toISOString(),
      pid: 999999999,
    };
    writeFileSync(lockPath, JSON.stringify(staleLock));

    await waitForMergeLock(dfDir, "run_new", 5000, 50);

    const info = getMergeLockInfo(dfDir);
    expect(info!.runId).toBe("run_new");
  });
});

describe("getMergeQueuePosition", () => {
  let db: SqliteDb;

  beforeEach(() => {
    db = getDbForTest();
  });

  test("returns 0 when run holds the lock", () => {
    const run = createRun(db, { spec_id: "s1" });
    updateRunStatus(db, run.id, "running");
    updateRunPhase(db, run.id, "merge");
    acquireMergeLock(dfDir, run.id);

    const pos = getMergeQueuePosition(dfDir, db, run.id);
    expect(pos).toBe(0);
  });

  test("returns null when run is not in merge phase", () => {
    const run = createRun(db, { spec_id: "s1" });
    updateRunStatus(db, run.id, "running");
    updateRunPhase(db, run.id, "build");

    const pos = getMergeQueuePosition(dfDir, db, run.id);
    expect(pos).toBeNull();
  });

  test("returns queue position when runs are ahead", () => {
    // Create three runs in merge phase
    const run1 = createRun(db, { spec_id: "s1" });
    updateRunStatus(db, run1.id, "running");
    updateRunPhase(db, run1.id, "merge");

    const run2 = createRun(db, { spec_id: "s2" });
    updateRunStatus(db, run2.id, "running");
    updateRunPhase(db, run2.id, "merge");

    const run3 = createRun(db, { spec_id: "s3" });
    updateRunStatus(db, run3.id, "running");
    updateRunPhase(db, run3.id, "merge");

    // run1 holds the lock
    acquireMergeLock(dfDir, run1.id);

    // run2 is second, run3 is third
    const pos2 = getMergeQueuePosition(dfDir, db, run2.id);
    const pos3 = getMergeQueuePosition(dfDir, db, run3.id);

    expect(pos2).toBe(1);
    expect(pos3).toBe(2);
  });

  test("returns null for unknown run", () => {
    const pos = getMergeQueuePosition(dfDir, db, "run_nonexistent");
    expect(pos).toBeNull();
  });
});
