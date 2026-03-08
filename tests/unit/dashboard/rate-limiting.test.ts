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

describe("Rate Limiting", () => {
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

  test("returns 429 after 100 requests from same IP within 60 seconds", async () => {
    // Send 100 requests - all should succeed
    for (let i = 0; i < 100; i++) {
      const res = await fetch(`${server.url}/api/runs`);
      expect(res.status).not.toBe(429);
    }

    // Request #101 should be rate limited
    const res = await fetch(`${server.url}/api/runs`);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("Too many requests");
  });

  test("different IPs have independent rate limit counters", async () => {
    // Exhaust rate limit for IP A
    for (let i = 0; i < 100; i++) {
      await fetch(`${server.url}/api/runs`, {
        headers: { "X-Forwarded-For": "10.0.0.1" },
      });
    }

    // IP A should be rate limited
    const resA = await fetch(`${server.url}/api/runs`, {
      headers: { "X-Forwarded-For": "10.0.0.1" },
    });
    expect(resA.status).toBe(429);

    // IP B should NOT be rate limited
    const resB = await fetch(`${server.url}/api/runs`, {
      headers: { "X-Forwarded-For": "10.0.0.2" },
    });
    expect(resB.status).not.toBe(429);
  });

  test("rate limit response has correct JSON structure", async () => {
    // Exhaust limit
    for (let i = 0; i < 100; i++) {
      await fetch(`${server.url}/api/runs`);
    }

    const res = await fetch(`${server.url}/api/runs`);
    expect(res.status).toBe(429);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    const body = await res.json();
    expect(body).toEqual({ error: "Too many requests" });
  });
});
