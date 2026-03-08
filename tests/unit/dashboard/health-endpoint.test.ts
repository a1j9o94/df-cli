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

describe("GET /api/health endpoint", () => {
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

  test("returns 200 with application/json content type", async () => {
    const resp = await fetch(`${server.url}/api/health`);
    expect(resp.status).toBe(200);
    expect(resp.headers.get("Content-Type")).toContain("application/json");
  });

  test("response contains all required fields", async () => {
    const resp = await fetch(`${server.url}/api/health`);
    const body = await resp.json();

    expect(body).toHaveProperty("uptime");
    expect(body).toHaveProperty("memoryUsage");
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("dbConnected");
    expect(body).toHaveProperty("version");
  });

  test("uptime is a non-negative number in seconds", async () => {
    const resp = await fetch(`${server.url}/api/health`);
    const body = await resp.json();

    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  test("memoryUsage is a number in MB", async () => {
    const resp = await fetch(`${server.url}/api/health`);
    const body = await resp.json();

    expect(typeof body.memoryUsage).toBe("number");
    expect(body.memoryUsage).toBeGreaterThan(0);
  });

  test("status is 'healthy' or 'degraded'", async () => {
    const resp = await fetch(`${server.url}/api/health`);
    const body = await resp.json();

    expect(["healthy", "degraded"]).toContain(body.status);
  });

  test("dbConnected is true when DB is accessible", async () => {
    const resp = await fetch(`${server.url}/api/health`);
    const body = await resp.json();

    expect(body.dbConnected).toBe(true);
  });

  test("version matches package.json version '0.1.0'", async () => {
    const resp = await fetch(`${server.url}/api/health`);
    const body = await resp.json();

    expect(body.version).toBe("0.1.0");
  });
});
