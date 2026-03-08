import { test, expect, describe, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import { createBlocker, getBlocker, listBlockers, resolveBlocker } from "../../../src/db/queries/blockers.js";
import { createAgent, getAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { encryptSecret, decryptSecret, isEncrypted } from "../../../src/utils/secrets.js";

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

describe("blocker request workflow", () => {
  let db: InstanceType<typeof Database>;
  const runId = "run_TEST001";
  const agentId = "agt_TEST001";

  beforeEach(() => {
    db = createTestDb();
    seedRun(db, runId);
    createAgent(db, {
      agent_id: agentId,
      run_id: runId,
      role: "builder",
      name: "test-builder",
      module_id: "my-module",
      system_prompt: "test",
    });
  });

  test("agent request creates blocker and marks agent as blocked", () => {
    const blocker = createBlocker(db, {
      run_id: runId,
      agent_id: agentId,
      module_id: "my-module",
      type: "secret",
      description: "Need Stripe test API key",
    });
    updateAgentStatus(db, agentId, "blocked");

    const agent = getAgent(db, agentId);
    expect(agent!.status).toBe("blocked");
    expect(blocker.status).toBe("pending");
    expect(blocker.type).toBe("secret");
  });

  test("resolve blocker resumes agent", () => {
    const blocker = createBlocker(db, {
      run_id: runId,
      agent_id: agentId,
      type: "decision",
      description: "OAuth or magic link?",
    });
    updateAgentStatus(db, agentId, "blocked");

    resolveBlocker(db, blocker.id, "OAuth2", "user");
    updateAgentStatus(db, agentId, "running");

    const agent = getAgent(db, agentId);
    expect(agent!.status).toBe("running");

    const resolved = getBlocker(db, blocker.id);
    expect(resolved!.status).toBe("resolved");
    expect(resolved!.resolved_value).toBe("OAuth2");
  });

  test("secret-type blockers store encrypted values", () => {
    const encKey = "test-encryption-key-32-chars-ok!";
    const secretValue = "sk_test_abc123";

    const blocker = createBlocker(db, {
      run_id: runId,
      agent_id: agentId,
      type: "secret",
      description: "Stripe API key",
    });

    const encrypted = encryptSecret(secretValue, encKey);
    resolveBlocker(db, blocker.id, encrypted, "user");

    const resolved = getBlocker(db, blocker.id);
    expect(isEncrypted(resolved!.resolved_value!)).toBe(true);

    const decrypted = decryptSecret(resolved!.resolved_value!, encKey);
    expect(decrypted).toBe(secretValue);
  });

  test("multiple blockers from different agents", () => {
    const agentId2 = "agt_TEST002";
    createAgent(db, {
      agent_id: agentId2,
      run_id: runId,
      role: "builder",
      name: "test-builder-2",
      module_id: "other-module",
      system_prompt: "test",
    });

    createBlocker(db, { run_id: runId, agent_id: agentId, type: "secret", description: "key1" });
    createBlocker(db, { run_id: runId, agent_id: agentId2, type: "access", description: "repo access" });

    const all = listBlockers(db, runId);
    expect(all).toHaveLength(2);

    // Resolve one, other stays pending
    resolveBlocker(db, all[0].id, "resolved-value", "user");
    const pending = listBlockers(db, runId, { pendingOnly: true });
    expect(pending).toHaveLength(1);
    expect(pending[0].agent_id).toBe(agentId2);
  });

  test("run pauses when only active agent is blocked", () => {
    createBlocker(db, {
      run_id: runId,
      agent_id: agentId,
      type: "resource",
      description: "Need OpenAPI spec",
    });
    updateAgentStatus(db, agentId, "blocked");

    // Check: all agents in run are either blocked, completed, or failed
    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND status IN ('pending', 'spawning', 'running')"
    ).all(runId);
    expect(agents).toHaveLength(0); // No active agents = should pause run
  });
});
