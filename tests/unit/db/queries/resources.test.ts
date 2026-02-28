import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import {
  ensureResource, getResource, listResources,
  acquireResource, releaseResource, setResourceCapacity,
} from "../../../../src/db/queries/resources.js";
import type { SqliteDb } from "../../../../src/db/index.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("resources queries", () => {
  test("ensureResource creates if not exists", () => {
    const r = ensureResource(db, "worktrees", 6);
    expect(r.id).toMatch(/^res_/);
    expect(r.name).toBe("worktrees");
    expect(r.capacity).toBe(6);
    expect(r.in_use).toBe(0);
  });

  test("ensureResource returns existing", () => {
    const r1 = ensureResource(db, "worktrees", 6);
    const r2 = ensureResource(db, "worktrees", 10);
    expect(r1.id).toBe(r2.id);
    expect(r2.capacity).toBe(6); // not overwritten
  });

  test("getResource returns null for missing", () => {
    expect(getResource(db, "nope")).toBeNull();
  });

  test("listResources returns all", () => {
    ensureResource(db, "worktrees", 6);
    ensureResource(db, "api_slots", 4);
    expect(listResources(db)).toHaveLength(2);
  });

  test("acquireResource succeeds when capacity available", () => {
    ensureResource(db, "worktrees", 2);
    expect(acquireResource(db, "worktrees")).toBe(true);
    expect(getResource(db, "worktrees")!.in_use).toBe(1);
    expect(acquireResource(db, "worktrees")).toBe(true);
    expect(getResource(db, "worktrees")!.in_use).toBe(2);
  });

  test("acquireResource fails when at capacity", () => {
    ensureResource(db, "worktrees", 1);
    expect(acquireResource(db, "worktrees")).toBe(true);
    expect(acquireResource(db, "worktrees")).toBe(false);
    expect(getResource(db, "worktrees")!.in_use).toBe(1);
  });

  test("acquireResource fails for nonexistent resource", () => {
    expect(acquireResource(db, "nonexistent")).toBe(false);
  });

  test("releaseResource decrements in_use", () => {
    ensureResource(db, "worktrees", 2);
    acquireResource(db, "worktrees");
    acquireResource(db, "worktrees");
    releaseResource(db, "worktrees");
    expect(getResource(db, "worktrees")!.in_use).toBe(1);
  });

  test("releaseResource does not go below 0", () => {
    ensureResource(db, "worktrees", 2);
    releaseResource(db, "worktrees");
    expect(getResource(db, "worktrees")!.in_use).toBe(0);
  });

  test("setResourceCapacity updates capacity", () => {
    ensureResource(db, "worktrees", 2);
    setResourceCapacity(db, "worktrees", 10);
    expect(getResource(db, "worktrees")!.capacity).toBe(10);
  });
});
