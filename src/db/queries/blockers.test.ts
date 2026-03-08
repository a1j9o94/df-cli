import { test, expect, beforeEach } from "bun:test";
import { getDbForTest, type SqliteDb } from "../index.js";
import {
  createBlocker,
  resolveBlocker,
  getBlocker,
  listBlockersByRun,
  listBlockersByAgent,
} from "./blockers.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
  // Seed prerequisite data
  db.prepare("INSERT INTO runs (id, spec_id, status) VALUES (?, ?, ?)").run("run_1", "spec_1", "running");
  db.prepare("INSERT INTO runs (id, spec_id, status) VALUES (?, ?, ?)").run("run_2", "spec_2", "running");
  db.prepare("INSERT INTO agents (id, run_id, role, name, status, system_prompt) VALUES (?, ?, ?, ?, ?, ?)").run("agt_1", "run_1", "builder", "builder-1", "running", "prompt");
  db.prepare("INSERT INTO agents (id, run_id, role, name, status, system_prompt) VALUES (?, ?, ?, ?, ?, ?)").run("agt_2", "run_1", "builder", "builder-2", "running", "prompt");
});

test("createBlocker creates a pending blocker with generated id", () => {
  const blocker = createBlocker(db, {
    run_id: "run_1",
    agent_id: "agt_1",
    module_id: "mod_1",
    type: "secret",
    description: "Need API key",
  });

  expect(blocker.id).toMatch(/^blk_/);
  expect(blocker.run_id).toBe("run_1");
  expect(blocker.agent_id).toBe("agt_1");
  expect(blocker.module_id).toBe("mod_1");
  expect(blocker.type).toBe("secret");
  expect(blocker.description).toBe("Need API key");
  expect(blocker.status).toBe("pending");
  expect(blocker.resolved_value).toBeNull();
  expect(blocker.resolved_by).toBeNull();
  expect(blocker.resolved_at).toBeNull();
});

test("createBlocker works without module_id", () => {
  const blocker = createBlocker(db, {
    run_id: "run_1",
    agent_id: "agt_1",
    type: "decision",
    description: "Need approval",
  });

  expect(blocker.module_id).toBeNull();
});

test("getBlocker returns blocker by id", () => {
  const created = createBlocker(db, {
    run_id: "run_1",
    agent_id: "agt_1",
    type: "access",
    description: "Need repo access",
  });

  const found = getBlocker(db, created.id);
  expect(found).toBeDefined();
  expect(found!.id).toBe(created.id);
  expect(found!.type).toBe("access");
});

test("getBlocker returns null for non-existent id", () => {
  const found = getBlocker(db, "blk_nonexistent");
  expect(found).toBeNull();
});

test("resolveBlocker updates status and resolution fields", () => {
  const created = createBlocker(db, {
    run_id: "run_1",
    agent_id: "agt_1",
    type: "decision",
    description: "Need approval",
  });

  const resolved = resolveBlocker(db, created.id, {
    value: "approved",
    resolved_by: "cli",
  });

  expect(resolved.status).toBe("resolved");
  expect(resolved.resolved_value).toBe("approved");
  expect(resolved.resolved_by).toBe("cli");
  expect(resolved.resolved_at).toBeDefined();
});

test("resolveBlocker works without value", () => {
  const created = createBlocker(db, {
    run_id: "run_1",
    agent_id: "agt_1",
    type: "resource",
    description: "Need resource",
  });

  const resolved = resolveBlocker(db, created.id, {
    resolved_by: "dashboard",
  });

  expect(resolved.status).toBe("resolved");
  expect(resolved.resolved_value).toBeNull();
  expect(resolved.resolved_by).toBe("dashboard");
});

test("listBlockersByRun returns all blockers for a run", () => {
  createBlocker(db, { run_id: "run_1", agent_id: "agt_1", type: "secret", description: "key1" });
  createBlocker(db, { run_id: "run_1", agent_id: "agt_2", type: "decision", description: "approval1" });
  createBlocker(db, { run_id: "run_2", agent_id: "agt_1", type: "access", description: "access1" });

  const run1Blockers = listBlockersByRun(db, "run_1");
  expect(run1Blockers).toHaveLength(2);
});

test("listBlockersByRun filters by status", () => {
  const b1 = createBlocker(db, { run_id: "run_1", agent_id: "agt_1", type: "secret", description: "key1" });
  createBlocker(db, { run_id: "run_1", agent_id: "agt_2", type: "decision", description: "approval1" });
  resolveBlocker(db, b1.id, { value: "val", resolved_by: "cli" });

  const pending = listBlockersByRun(db, "run_1", "pending");
  expect(pending).toHaveLength(1);

  const resolved = listBlockersByRun(db, "run_1", "resolved");
  expect(resolved).toHaveLength(1);
});

test("listBlockersByAgent returns blockers for specific agent", () => {
  createBlocker(db, { run_id: "run_1", agent_id: "agt_1", type: "secret", description: "key1" });
  createBlocker(db, { run_id: "run_1", agent_id: "agt_1", type: "decision", description: "approval1" });
  createBlocker(db, { run_id: "run_1", agent_id: "agt_2", type: "access", description: "access1" });

  const agt1Blockers = listBlockersByAgent(db, "agt_1");
  expect(agt1Blockers).toHaveLength(2);

  const agt2Blockers = listBlockersByAgent(db, "agt_2");
  expect(agt2Blockers).toHaveLength(1);
});
