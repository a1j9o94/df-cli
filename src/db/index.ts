import { Database } from "bun:sqlite";
import { join } from "node:path";
import { SCHEMA_SQL } from "./schema.js";

export type SqliteDb = InstanceType<typeof Database>;

let db: SqliteDb | null = null;

export function getDb(dbPath?: string): Database {
  if (db) return db;

  const path = dbPath ?? join(process.cwd(), ".df", "state.db");
  db = new Database(path);

  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);

  return db;
}

export function getDbForTest(): Database {
  const testDb = new Database(":memory:");
  testDb.exec("PRAGMA journal_mode = WAL");
  testDb.exec("PRAGMA foreign_keys = ON");
  testDb.exec(SCHEMA_SQL);
  return testDb;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
