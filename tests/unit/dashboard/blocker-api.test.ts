import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { startServer, type ServerHandle } from "../../../src/dashboard/server.js";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import { createBlocker, getBlocker } from "../../../src/db/queries/blockers.js";

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

function seedRun(db: InstanceType<typeof Database>, runId: string) {
  db.prepare(
    "INSERT INTO runs (id, spec_id, status, current_phase, budget_usd) VALUES (?, ?, 'running', 'build', 10.0)"
  ).run(runId, "spec_test");
}

function seedAgent(db: InstanceType<typeof Database>, agentId: string, runId: string) {
  db.prepare(
    "INSERT INTO agents (id, run_id, role, name, status) VALUES (?, ?, 'builder', 'test-agent', 'running')"
  ).run(agentId, runId);
}

describe("GET /api/runs/:runId/blockers", () => {
  let server: ServerHandle;
  let db: InstanceType<typeof Database>;

  beforeEach(async () => {
    db = createTestDb();
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    server.stop();
    db.close();
  });

  test("returns empty array when no blockers exist", async () => {
    seedRun(db, "run_test1");
    const resp = await fetch(`${server.url}/api/runs/run_test1/blockers`);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body).toEqual([]);
  });

  test("returns blockers for a given run", async () => {
    seedRun(db, "run_test2");
    seedAgent(db, "agt_test1", "run_test2");
    createBlocker(db, {
      run_id: "run_test2",
      agent_id: "agt_test1",
      type: "secret",
      description: "Need API key",
    });
    createBlocker(db, {
      run_id: "run_test2",
      agent_id: "agt_test1",
      type: "decision",
      description: "Which framework?",
    });

    const resp = await fetch(`${server.url}/api/runs/run_test2/blockers`);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body).toHaveLength(2);
    expect(body[0].type).toBe("secret");
    expect(body[1].type).toBe("decision");
  });

  test("filters by status query param", async () => {
    seedRun(db, "run_test3");
    seedAgent(db, "agt_test2", "run_test3");
    const b1 = createBlocker(db, {
      run_id: "run_test3",
      agent_id: "agt_test2",
      type: "secret",
      description: "Need key",
    });
    createBlocker(db, {
      run_id: "run_test3",
      agent_id: "agt_test2",
      type: "decision",
      description: "Choose DB",
    });
    // Resolve the first one
    db.prepare(
      "UPDATE blocker_requests SET status = 'resolved', resolved_by = 'cli' WHERE id = ?"
    ).run(b1.id);

    const resp = await fetch(`${server.url}/api/runs/run_test3/blockers?status=pending`);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body).toHaveLength(1);
    expect(body[0].description).toBe("Choose DB");
  });
});

describe("POST /api/runs/:runId/blockers/:id/resolve", () => {
  let server: ServerHandle;
  let db: InstanceType<typeof Database>;

  beforeEach(async () => {
    db = createTestDb();
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    server.stop();
    db.close();
  });

  test("resolves a decision blocker with a value", async () => {
    seedRun(db, "run_resolve1");
    seedAgent(db, "agt_resolve1", "run_resolve1");
    const blocker = createBlocker(db, {
      run_id: "run_resolve1",
      agent_id: "agt_resolve1",
      type: "decision",
      description: "Which framework?",
    });

    const resp = await fetch(
      `${server.url}/api/runs/run_resolve1/blockers/${blocker.id}/resolve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "React" }),
      }
    );
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.success).toBe(true);
    expect(body.blocker.status).toBe("resolved");
    expect(body.blocker.resolved_by).toBe("dashboard");
    expect(body.blocker.resolved_value).toBe("React");
  });

  test("resolves a secret blocker with env_key and env_value", async () => {
    seedRun(db, "run_resolve2");
    seedAgent(db, "agt_resolve2", "run_resolve2");
    const blocker = createBlocker(db, {
      run_id: "run_resolve2",
      agent_id: "agt_resolve2",
      type: "secret",
      description: "Need API key",
    });

    const resp = await fetch(
      `${server.url}/api/runs/run_resolve2/blockers/${blocker.id}/resolve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ env_key: "API_KEY", env_value: "sk-12345" }),
      }
    );
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.success).toBe(true);
    expect(body.blocker.status).toBe("resolved");
    expect(body.blocker.resolved_by).toBe("dashboard");
    // Secret value should be encrypted, not plain text
    expect(body.blocker.resolved_value).not.toBe("sk-12345");
    expect(body.blocker.resolved_value).toBeTruthy();
  });

  test("returns 404 for non-existent blocker", async () => {
    seedRun(db, "run_resolve3");
    const resp = await fetch(
      `${server.url}/api/runs/run_resolve3/blockers/nonexistent/resolve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "test" }),
      }
    );
    expect(resp.status).toBe(404);
  });
});
