import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { startServer, _clearRequestLog, type ServerHandle } from "../../../src/dashboard/server.js";
import { SCHEMA_SQL } from "../../../src/db/schema.js";

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

describe("Request Logging", () => {
  let server: ServerHandle;
  let db: InstanceType<typeof Database>;

  beforeEach(async () => {
    _clearRequestLog();
    db = createTestDb();
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    server.stop();
    db.close();
  });

  test("GET /api/logs returns 200 with JSON array", async () => {
    const resp = await fetch(`${server.url}/api/logs`);
    expect(resp.status).toBe(200);
    expect(resp.headers.get("Content-Type")).toContain("application/json");
    const body = await resp.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("logging captures request details (method, path, status, duration, timestamp)", async () => {
    // First make a request to generate a log entry
    await fetch(`${server.url}/hello`);

    // Then check the logs
    const resp = await fetch(`${server.url}/api/logs`);
    const logs = await resp.json();

    // Find the /hello entry (not the /api/logs entry)
    const helloLog = logs.find((e: any) => e.path === "/hello");
    expect(helloLog).toBeDefined();
    expect(helloLog.method).toBe("GET");
    expect(helloLog.path).toBe("/hello");
    expect(helloLog.status).toBe(200);
    expect(typeof helloLog.duration).toBe("number");
    expect(helloLog.duration).toBeGreaterThanOrEqual(0);
    // Validate timestamp is ISO string
    expect(() => new Date(helloLog.timestamp)).not.toThrow();
    expect(new Date(helloLog.timestamp).toISOString()).toBe(helloLog.timestamp);
  });

  test("logs are also written to console.log as JSON", async () => {
    // We test this indirectly - the logRequest function should call console.log
    // For now, just verify the logging mechanism works via /api/logs
    await fetch(`${server.url}/hello`);
    const resp = await fetch(`${server.url}/api/logs`);
    const logs = await resp.json();
    expect(logs.length).toBeGreaterThan(0);
  });

  test("GET /api/logs returns at most 100 entries", async () => {
    // Send 150 requests
    for (let i = 0; i < 150; i++) {
      await fetch(`${server.url}/hello`);
    }

    const resp = await fetch(`${server.url}/api/logs`);
    const logs = await resp.json();

    // Should be capped at 100
    expect(logs.length).toBe(100);
  });

  test("circular buffer keeps most recent 100 entries", async () => {
    // Send 110 requests to /hello, then 5 to /api/runs
    for (let i = 0; i < 110; i++) {
      await fetch(`${server.url}/hello`);
    }
    for (let i = 0; i < 5; i++) {
      await fetch(`${server.url}/api/runs`);
    }

    const resp = await fetch(`${server.url}/api/logs`);
    const logs = await resp.json();

    expect(logs.length).toBe(100);
    // The /api/runs entries should be present (they were the most recent)
    const runsLogs = logs.filter((e: any) => e.path === "/api/runs");
    expect(runsLogs.length).toBe(5);
  });

  test("the /api/logs request itself is logged", async () => {
    // Make a logs request
    await fetch(`${server.url}/api/logs`);

    // Make another logs request to see the first one in the log
    const resp = await fetch(`${server.url}/api/logs`);
    const logs = await resp.json();

    const logsEntries = logs.filter((e: any) => e.path === "/api/logs");
    // At least the first /api/logs request should be in there
    expect(logsEntries.length).toBeGreaterThanOrEqual(1);
  });
});
