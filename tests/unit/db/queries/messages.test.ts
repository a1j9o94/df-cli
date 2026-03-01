import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import { createRun } from "../../../../src/db/queries/runs.js";
import { createAgent } from "../../../../src/db/queries/agents.js";
import {
  createMessage, getMessagesForAgent, getMessagesForRole,
  markMessageRead, markAllReadForAgent,
} from "../../../../src/db/queries/messages.js";
import type { SqliteDb } from "../../../../src/db/index.js";

let db: SqliteDb;
let runId: string;
let agentA: string;
let agentB: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "s1" }).id;
  agentA = createAgent(db, { agent_id: "", run_id: runId, role: "orchestrator", name: "orch", system_prompt: "p" }).id;
  agentB = createAgent(db, { agent_id: "", run_id: runId, role: "builder", name: "b1", system_prompt: "p" }).id;
});

describe("messages queries", () => {
  test("createMessage creates a message", () => {
    const msg = createMessage(db, runId, agentA, "Hello builder", { toAgentId: agentB });
    expect(msg.id).toMatch(/^msg_/);
    expect(msg.from_agent_id).toBe(agentA);
    expect(msg.to_agent_id).toBe(agentB);
    expect(msg.read).toBe(false);
  });

  test("getMessagesForAgent returns messages", () => {
    createMessage(db, runId, agentA, "msg1", { toAgentId: agentB });
    createMessage(db, runId, agentA, "msg2", { toAgentId: agentB });
    expect(getMessagesForAgent(db, agentB)).toHaveLength(2);
    expect(getMessagesForAgent(db, agentA)).toHaveLength(0);
  });

  test("getMessagesForAgent unreadOnly", () => {
    const msg = createMessage(db, runId, agentA, "msg1", { toAgentId: agentB });
    createMessage(db, runId, agentA, "msg2", { toAgentId: agentB });
    markMessageRead(db, msg.id);

    expect(getMessagesForAgent(db, agentB, true)).toHaveLength(1);
    expect(getMessagesForAgent(db, agentB, false)).toHaveLength(2);
  });

  test("getMessagesForRole works", () => {
    createMessage(db, runId, agentA, "to builders", { toRole: "builder" });
    expect(getMessagesForRole(db, runId, "builder")).toHaveLength(1);
    expect(getMessagesForRole(db, runId, "architect")).toHaveLength(0);
  });

  test("markAllReadForAgent marks all unread messages", () => {
    createMessage(db, runId, agentA, "m1", { toAgentId: agentB });
    createMessage(db, runId, agentA, "m2", { toAgentId: agentB });
    markAllReadForAgent(db, agentB);

    expect(getMessagesForAgent(db, agentB, true)).toHaveLength(0);
    expect(getMessagesForAgent(db, agentB)).toHaveLength(2);
  });
});
