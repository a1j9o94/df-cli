import { test, expect, describe, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import {
  createBlocker,
  getBlocker,
  listBlockers,
  resolveBlocker,
} from "../../../src/db/queries/blockers.js";

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

function seedRun(db: InstanceType<typeof Database>, runId: string) {
  db.prepare(
    "INSERT INTO runs (id, spec_id, status) VALUES (?, 'spec_test', 'running')"
  ).run(runId);
}

function seedAgent(db: InstanceType<typeof Database>, agentId: string, runId: string, moduleId?: string) {
  db.prepare(
    "INSERT INTO agents (id, run_id, role, name, status, module_id, system_prompt) VALUES (?, ?, 'builder', 'test-builder', 'running', ?, 'test')"
  ).run(agentId, runId, moduleId ?? null);
}

describe("blocker queries", () => {
  let db: InstanceType<typeof Database>;
  const runId = "run_TEST001";
  const agentId = "agt_TEST001";

  beforeEach(() => {
    db = createTestDb();
    seedRun(db, runId);
    seedAgent(db, agentId, runId, "my-module");
  });

  test("createBlocker creates a blocker record", () => {
    const blocker = createBlocker(db, {
      run_id: runId,
      agent_id: agentId,
      module_id: "my-module",
      type: "secret",
      description: "Need Stripe API key",
    });

    expect(blocker.id).toStartWith("blk_");
    expect(blocker.run_id).toBe(runId);
    expect(blocker.agent_id).toBe(agentId);
    expect(blocker.module_id).toBe("my-module");
    expect(blocker.type).toBe("secret");
    expect(blocker.description).toBe("Need Stripe API key");
    expect(blocker.status).toBe("pending");
    expect(blocker.resolved_value).toBeNull();
    expect(blocker.resolved_at).toBeNull();
    expect(blocker.created_at).toBeTruthy();
  });

  test("getBlocker retrieves a blocker by ID", () => {
    const created = createBlocker(db, {
      run_id: runId,
      agent_id: agentId,
      type: "decision",
      description: "OAuth or magic link?",
    });

    const fetched = getBlocker(db, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.type).toBe("decision");
  });

  test("getBlocker returns null for non-existent ID", () => {
    const result = getBlocker(db, "blk_NONEXISTENT");
    expect(result).toBeNull();
  });

  test("listBlockers returns all blockers for a run", () => {
    createBlocker(db, { run_id: runId, agent_id: agentId, type: "secret", description: "key1" });
    createBlocker(db, { run_id: runId, agent_id: agentId, type: "access", description: "repo access" });

    const blockers = listBlockers(db, runId);
    expect(blockers).toHaveLength(2);
  });

  test("listBlockers filters by pending status", () => {
    const b1 = createBlocker(db, { run_id: runId, agent_id: agentId, type: "secret", description: "key1" });
    createBlocker(db, { run_id: runId, agent_id: agentId, type: "access", description: "repo access" });
    resolveBlocker(db, b1.id, "sk_test_123", "user");

    const pending = listBlockers(db, runId, { pendingOnly: true });
    expect(pending).toHaveLength(1);
    expect(pending[0].type).toBe("access");
  });

  test("resolveBlocker updates status and value", () => {
    const blocker = createBlocker(db, {
      run_id: runId,
      agent_id: agentId,
      type: "secret",
      description: "Need API key",
    });

    resolveBlocker(db, blocker.id, "sk_test_abc", "user");

    const resolved = getBlocker(db, blocker.id);
    expect(resolved!.status).toBe("resolved");
    expect(resolved!.resolved_value).toBe("sk_test_abc");
    expect(resolved!.resolved_by).toBe("user");
    expect(resolved!.resolved_at).toBeTruthy();
  });

  test("listBlockers returns blockers in chronological order", () => {
    createBlocker(db, { run_id: runId, agent_id: agentId, type: "secret", description: "first" });
    createBlocker(db, { run_id: runId, agent_id: agentId, type: "decision", description: "second" });

    const blockers = listBlockers(db, runId);
    expect(blockers[0].description).toBe("first");
    expect(blockers[1].description).toBe("second");
  });
});
