import { test, expect, beforeEach, afterEach, describe } from "bun:test";
import { Database } from "bun:sqlite";
import { startServer, type ServerHandle, type ServerConfig } from "../../../src/dashboard/server.js";
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
  let port: number;

  beforeEach(async () => {
    db = createTestDb();
    port = 10000 + Math.floor(Math.random() * 50000);
    server = await startServer({ port, db } as ServerConfig);
  });

  afterEach(() => {
    server.stop();
    db.close();
  });

  test("GET /api/logs returns 200 with JSON array", async () => {
    const res = await fetch(`${server.url}/api/logs`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("logging captures request details (method, path, status, duration, timestamp)", async () => {
    // Make a request
    await fetch(`${server.url}/api/runs`);

    // Check logs
    const res = await fetch(`${server.url}/api/logs`);
    const logs = await res.json();

    // Find the /api/runs log entry (not /api/logs itself)
    const runsLog = logs.find((l: any) => l.path === "/api/runs");
    expect(runsLog).toBeDefined();
    expect(runsLog.method).toBe("GET");
    expect(runsLog.path).toBe("/api/runs");
    expect(runsLog.status).toBe(200);
    expect(typeof runsLog.duration).toBe("number");
    expect(runsLog.duration).toBeGreaterThanOrEqual(0);
    expect(runsLog.timestamp).toBeDefined();
  });

  test("GET /api/logs returns last 100 requests (not more)", async () => {
    // Make 110 requests
    for (let i = 0; i < 110; i++) {
      await fetch(`${server.url}/hello`);
    }

    // Get logs from a different IP to avoid rate limiting issues
    const res = await fetch(`${server.url}/api/logs`, {
      headers: { "X-Forwarded-For": "10.0.0.99" },
    });
    const logs = await res.json();

    // Should be exactly 100 (the most recent 100)
    expect(logs.length).toBe(100);
  });

  test("logs contain most recent requests (not oldest)", async () => {
    // Make 105 requests to /hello
    for (let i = 0; i < 105; i++) {
      await fetch(`${server.url}/hello`);
    }

    // Make 1 request to a distinct path
    await fetch(`${server.url}/api/runs`, {
      headers: { "X-Forwarded-For": "10.0.0.99" },
    });

    const res = await fetch(`${server.url}/api/logs`, {
      headers: { "X-Forwarded-For": "10.0.0.99" },
    });
    const logs = await res.json();

    // The /api/runs request should be in the most recent 100
    const hasRunsLog = logs.some((l: any) => l.path === "/api/runs");
    expect(hasRunsLog).toBe(true);
  });

  test("each log entry has required fields", async () => {
    await fetch(`${server.url}/hello`);

    const res = await fetch(`${server.url}/api/logs`);
    const logs = await res.json();

    expect(logs.length).toBeGreaterThan(0);
    const entry = logs[0];
    expect(entry).toHaveProperty("method");
    expect(entry).toHaveProperty("path");
    expect(entry).toHaveProperty("status");
    expect(entry).toHaveProperty("duration");
    expect(entry).toHaveProperty("timestamp");
  });

  test("rate-limited requests (429) are also logged", async () => {
    // Exhaust rate limit for an IP
    for (let i = 0; i < 100; i++) {
      await fetch(`${server.url}/api/runs`, {
        headers: { "X-Forwarded-For": "10.0.0.50" },
      });
    }

    // This should return 429
    const rateLimitedRes = await fetch(`${server.url}/api/runs`, {
      headers: { "X-Forwarded-For": "10.0.0.50" },
    });
    expect(rateLimitedRes.status).toBe(429);

    // Check that the 429 is logged
    const res = await fetch(`${server.url}/api/logs`, {
      headers: { "X-Forwarded-For": "10.0.0.98" },
    });
    const logs = await res.json();

    const has429 = logs.some((l: any) => l.status === 429);
    expect(has429).toBe(true);
  });
});
