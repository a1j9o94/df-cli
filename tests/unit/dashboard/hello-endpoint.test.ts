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

describe("GET /hello endpoint", () => {
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

  test("returns 200 with correct JSON response", async () => {
    const resp = await fetch(`${server.url}/hello`);

    expect(resp.status).toBe(200);
    expect(resp.headers.get("Content-Type")).toContain("application/json");

    const body = await resp.json();
    expect(body).toEqual({ message: "Hello, world!" });
  });

  test("message key exists and value is exact string", async () => {
    const resp = await fetch(`${server.url}/hello`);
    const body = await resp.json();

    expect(body).toHaveProperty("message");
    expect(body.message).toBe("Hello, world!");
  });
});
