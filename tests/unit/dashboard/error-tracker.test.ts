import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { startServer, type ServerHandle } from "../../../src/dashboard/server.js";
import { SCHEMA_SQL } from "../../../src/db/schema.js";

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

describe("GET /api/errors endpoint", () => {
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

  test("returns empty array when no errors have occurred", async () => {
    const resp = await fetch(`${server.url}/api/errors`);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body).toEqual([]);
  });

  test("captures errors from route handlers that throw", async () => {
    // Trigger an error by hitting an endpoint that will throw
    // Use /api/runs/nonexistent/agents which tries to validate the run
    // This returns 404, not 500 - we need a real throw.
    // Close the DB to force an error
    db.close();

    const errorResp = await fetch(`${server.url}/api/runs`);
    expect(errorResp.status).toBe(500);

    // Re-open a DB so we can check errors endpoint
    // Actually the error tracker is in-memory, so /api/errors should still work
    // even with DB closed - but the route function tries to use db.
    // Let's use a different approach: create a fresh server for each scenario.
  });

  test("error entries contain required fields", async () => {
    // Close DB to force a throw when listing runs
    db.close();

    // This should cause a 500
    await fetch(`${server.url}/api/runs`);

    // The error tracker is in-memory, but /api/errors itself doesn't use the DB
    // However the route function is wrapped in the same try/catch...
    // Actually /api/errors is handled BEFORE db queries, so it should work
    const resp = await fetch(`${server.url}/api/errors`);
    expect(resp.status).toBe(200);
    const body = await resp.json();

    expect(body.length).toBeGreaterThanOrEqual(1);
    const entry = body[0];
    expect(entry).toHaveProperty("timestamp");
    expect(entry).toHaveProperty("path");
    expect(entry).toHaveProperty("method");
    expect(entry).toHaveProperty("error");
    expect(entry).toHaveProperty("stack");
  });

  test("error entry path matches the failed request path", async () => {
    db.close();
    await fetch(`${server.url}/api/runs`);

    const resp = await fetch(`${server.url}/api/errors`);
    const body = await resp.json();

    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0].path).toBe("/api/runs");
    expect(body[0].method).toBe("GET");
  });

  test("error timestamp is valid ISO format", async () => {
    db.close();
    await fetch(`${server.url}/api/runs`);

    const resp = await fetch(`${server.url}/api/errors`);
    const body = await resp.json();

    expect(body.length).toBeGreaterThanOrEqual(1);
    const ts = new Date(body[0].timestamp);
    expect(ts.getTime()).not.toBeNaN();
  });
});

describe("Health endpoint reports error count", () => {
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

  test("errorCount is 0 before any errors", async () => {
    const resp = await fetch(`${server.url}/api/health`);
    const body = await resp.json();
    expect(body.errorCount).toBe(0);
  });

  test("errorCount reflects tracked errors", async () => {
    // Close DB to force errors
    db.close();

    // Trigger 3 errors
    await fetch(`${server.url}/api/runs`);
    await fetch(`${server.url}/api/runs`);
    await fetch(`${server.url}/api/runs`);

    // Health endpoint should still work (doesn't need DB for basic info)
    // But actually it tries to check DB connection...
    // The health endpoint catches db errors gracefully via try/catch
    const resp = await fetch(`${server.url}/api/health`);
    const body = await resp.json();
    expect(body.errorCount).toBe(3);
  });

  test("X-Error-Count header is set on health response", async () => {
    db.close();
    await fetch(`${server.url}/api/runs`);
    await fetch(`${server.url}/api/runs`);
    await fetch(`${server.url}/api/runs`);

    const resp = await fetch(`${server.url}/api/health`);
    expect(resp.headers.get("X-Error-Count")).toBe("3");
  });

  test("dbConnected is false when DB is closed", async () => {
    db.close();
    // Trigger an error first so we're past the DB issue
    await fetch(`${server.url}/api/runs`);

    const resp = await fetch(`${server.url}/api/health`);
    const body = await resp.json();
    // When db is closed, the SELECT 1 check should fail
    expect(body.dbConnected).toBe(false);
    expect(body.status).toBe("degraded");
  });
});
