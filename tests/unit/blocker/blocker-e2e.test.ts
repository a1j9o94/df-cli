import { test, expect, describe, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import { createBlocker, getBlocker, listBlockers, resolveBlocker, getBlockersForAgent } from "../../../src/db/queries/blockers.js";
import { createAgent, getAgent, updateAgentStatus, getActiveAgents } from "../../../src/db/queries/agents.js";
import { createMessage, getMessagesForAgent } from "../../../src/db/queries/messages.js";
import { createEvent, listEvents } from "../../../src/db/queries/events.js";
import { encryptSecret, decryptSecret, isEncrypted, maskSecret, getEncryptionKey } from "../../../src/utils/secrets.js";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

function seedRun(db: InstanceType<typeof Database>, runId: string, status = "running") {
  db.prepare(
    "INSERT INTO runs (id, spec_id, status) VALUES (?, 'spec_test', ?)"
  ).run(runId, status);
}

describe("blocker end-to-end workflow", () => {
  let db: InstanceType<typeof Database>;
  const runId = "run_E2E001";

  beforeEach(() => {
    db = createTestDb();
    seedRun(db, runId);
  });

  test("full request → resolve flow for secret type", () => {
    // Setup agent
    const agent = createAgent(db, {
      agent_id: "agt_E2E001",
      run_id: runId,
      role: "builder",
      name: "builder-auth",
      module_id: "auth-module",
      system_prompt: "build auth",
    });

    // 1. Agent raises blocker
    const blocker = createBlocker(db, {
      run_id: runId,
      agent_id: agent.id,
      module_id: "auth-module",
      type: "secret",
      description: "Stripe test API key (sk_test_...) for payment integration tests",
    });
    updateAgentStatus(db, agent.id, "blocked");
    createEvent(db, runId, "agent-blocked", { blocker_id: blocker.id, type: "secret" }, agent.id);

    // Verify: agent blocked, blocker pending
    expect(getAgent(db, agent.id)!.status).toBe("blocked");
    expect(blocker.status).toBe("pending");
    expect(listBlockers(db, runId, { pendingOnly: true })).toHaveLength(1);

    // 2. User resolves via CLI
    const encKey = "test-key-32-bytes-padding-here!!";
    const secretValue = "sk_test_4eC39HqLyjWDarjtT1zdp7dc";
    const encrypted = encryptSecret(secretValue, encKey);

    resolveBlocker(db, blocker.id, encrypted, "user");
    updateAgentStatus(db, agent.id, "running");

    // Send non-secret mail to agent
    createMessage(db, runId, "system", "Blocker resolved. Secret has been provided.", {
      toAgentId: agent.id,
    });

    createEvent(db, runId, "blocker-resolved", { blocker_id: blocker.id, type: "secret" }, agent.id);

    // Verify: agent running, blocker resolved, value encrypted
    expect(getAgent(db, agent.id)!.status).toBe("running");
    const resolved = getBlocker(db, blocker.id)!;
    expect(resolved.status).toBe("resolved");
    expect(isEncrypted(resolved.resolved_value!)).toBe(true);
    expect(decryptSecret(resolved.resolved_value!, encKey)).toBe(secretValue);
    expect(listBlockers(db, runId, { pendingOnly: true })).toHaveLength(0);

    // Verify: mail doesn't contain the secret value
    const messages = getMessagesForAgent(db, agent.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].body).not.toContain(secretValue);

    // Verify: events logged
    const events = listEvents(db, runId);
    const blockerEvents = events.filter(
      (e) => e.type === "agent-blocked" || e.type === "blocker-resolved"
    );
    expect(blockerEvents).toHaveLength(2);
  });

  test("decision blocker flow", () => {
    const agent = createAgent(db, {
      agent_id: "agt_E2E002",
      run_id: runId,
      role: "architect",
      name: "architect-main",
      system_prompt: "architect",
    });

    // Architect raises decision blocker
    const blocker = createBlocker(db, {
      run_id: runId,
      agent_id: agent.id,
      type: "decision",
      description: "Spec says add auth but doesn't specify method. OAuth2, magic link, or username/password?",
    });
    updateAgentStatus(db, agent.id, "blocked");

    // User responds with decision
    resolveBlocker(db, blocker.id, "OAuth2", "user");
    updateAgentStatus(db, agent.id, "running");

    // Send decision to agent via mail
    createMessage(db, runId, "system", "Blocker resolved: OAuth2", {
      toAgentId: agent.id,
    });

    // Verify
    const resolved = getBlocker(db, blocker.id)!;
    expect(resolved.resolved_value).toBe("OAuth2");
    const messages = getMessagesForAgent(db, agent.id);
    expect(messages[0].body).toContain("OAuth2");
  });

  test("multiple simultaneous blockers from different agents", () => {
    const agent1 = createAgent(db, {
      agent_id: "agt_E2E003",
      run_id: runId,
      role: "builder",
      name: "builder-1",
      module_id: "mod-a",
      system_prompt: "build",
    });
    const agent2 = createAgent(db, {
      agent_id: "agt_E2E004",
      run_id: runId,
      role: "builder",
      name: "builder-2",
      module_id: "mod-b",
      system_prompt: "build",
    });

    const b1 = createBlocker(db, {
      run_id: runId, agent_id: agent1.id, module_id: "mod-a",
      type: "secret", description: "Need DB password",
    });
    const b2 = createBlocker(db, {
      run_id: runId, agent_id: agent2.id, module_id: "mod-b",
      type: "access", description: "Need read access to private repo",
    });
    updateAgentStatus(db, agent1.id, "blocked");
    updateAgentStatus(db, agent2.id, "blocked");

    // Both show in pending
    expect(listBlockers(db, runId, { pendingOnly: true })).toHaveLength(2);

    // Resolve one
    resolveBlocker(db, b1.id, "my-db-password", "user");
    updateAgentStatus(db, agent1.id, "running");

    // One still pending
    const pending = listBlockers(db, runId, { pendingOnly: true });
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(b2.id);

    // agent1 running, agent2 still blocked
    expect(getAgent(db, agent1.id)!.status).toBe("running");
    expect(getAgent(db, agent2.id)!.status).toBe("blocked");
  });

  test("getBlockersForAgent returns blockers for specific agent", () => {
    const agent = createAgent(db, {
      agent_id: "agt_E2E005",
      run_id: runId,
      role: "builder",
      name: "builder-test",
      system_prompt: "build",
    });

    createBlocker(db, { run_id: runId, agent_id: agent.id, type: "secret", description: "key1" });
    createBlocker(db, { run_id: runId, agent_id: agent.id, type: "resource", description: "openapi spec" });

    const agentBlockers = getBlockersForAgent(db, agent.id);
    expect(agentBlockers).toHaveLength(2);
  });

  test("encryption key generation and persistence", () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "df-test-"));
    try {
      const key1 = getEncryptionKey(tmpDir);
      expect(key1.length).toBe(64); // 32 bytes hex = 64 chars
      expect(existsSync(join(tmpDir, "secret.key"))).toBe(true);

      // Second call returns same key
      const key2 = getEncryptionKey(tmpDir);
      expect(key2).toBe(key1);
    } finally {
      rmSync(tmpDir, { recursive: true });
    }
  });

  test("maskSecret hides sensitive values", () => {
    expect(maskSecret("sk_test_4eC39HqLyjWDarjtT1zdp7dc")).toBe("****************************p7dc");
    expect(maskSecret("short")).toBe("*hort");
    expect(maskSecret("abc")).toBe("***");
  });
});
