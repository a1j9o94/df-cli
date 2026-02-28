import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import { createRun } from "../../../../src/db/queries/runs.js";
import { createEvent, listEvents, getLatestEvent } from "../../../../src/db/queries/events.js";
import type { SqliteDb } from "../../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "s1" }).id;
});

describe("events queries", () => {
  test("createEvent inserts an event", () => {
    const evt = createEvent(db, runId, "run-started");
    expect(evt.id).toMatch(/^evt_/);
    expect(evt.type).toBe("run-started");
    expect(evt.data).toBeNull();
  });

  test("createEvent with data and agentId", () => {
    const evt = createEvent(db, runId, "agent-spawned", { role: "builder" }, "agt_123");
    expect(evt.agent_id).toBe("agt_123");
    expect(JSON.parse(evt.data!)).toEqual({ role: "builder" });
  });

  test("listEvents filters by type and agentId", () => {
    createEvent(db, runId, "run-started");
    createEvent(db, runId, "agent-spawned", undefined, "agt_1");
    createEvent(db, runId, "agent-spawned", undefined, "agt_2");
    createEvent(db, runId, "agent-completed", undefined, "agt_1");

    expect(listEvents(db, runId)).toHaveLength(4);
    expect(listEvents(db, runId, { type: "agent-spawned" })).toHaveLength(2);
    expect(listEvents(db, runId, { agentId: "agt_1" })).toHaveLength(2);
    expect(listEvents(db, runId, { type: "agent-spawned", agentId: "agt_1" })).toHaveLength(1);
  });

  test("listEvents respects limit", () => {
    createEvent(db, runId, "run-started");
    createEvent(db, runId, "phase-started");
    createEvent(db, runId, "phase-completed");

    expect(listEvents(db, runId, { limit: 2 })).toHaveLength(2);
  });

  test("getLatestEvent returns most recent", () => {
    createEvent(db, runId, "agent-heartbeat", { seq: 1 }, "agt_1");
    createEvent(db, runId, "agent-heartbeat", { seq: 2 }, "agt_1");

    const latest = getLatestEvent(db, runId, "agent-heartbeat");
    expect(latest).not.toBeNull();
    expect(JSON.parse(latest!.data!).seq).toBe(2);
  });

  test("getLatestEvent returns null when none", () => {
    expect(getLatestEvent(db, runId, "run-failed")).toBeNull();
  });
});
