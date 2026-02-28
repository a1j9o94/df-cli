import type { SqliteDb } from "../index.js";
import type { ResourceRecord } from "../../types/index.js";
import { newResourceId } from "../../utils/id.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function ensureResource(db: SqliteDb, name: string, capacity: number): ResourceRecord {
  const existing = getResource(db, name);
  if (existing) return existing;

  const id = newResourceId();
  const ts = now();

  db.prepare(
    `INSERT INTO resources (id, name, capacity, in_use, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?)`
  ).run(id, name, capacity, ts, ts);

  return getResource(db, name)!;
}

export function getResource(db: SqliteDb, name: string): ResourceRecord | null {
  return db.prepare("SELECT * FROM resources WHERE name = ?").get(name) as ResourceRecord | null;
}

export function listResources(db: SqliteDb): ResourceRecord[] {
  return db.prepare("SELECT * FROM resources ORDER BY name").all() as ResourceRecord[];
}

export function acquireResource(db: SqliteDb, name: string): boolean {
  // Atomic acquire using BEGIN IMMEDIATE for write lock
  const txn = db.transaction(() => {
    const resource = db.prepare(
      "SELECT * FROM resources WHERE name = ?"
    ).get(name) as ResourceRecord | null;

    if (!resource || resource.in_use >= resource.capacity) {
      return false;
    }

    db.prepare(
      "UPDATE resources SET in_use = in_use + 1, updated_at = ? WHERE name = ?"
    ).run(now(), name);

    return true;
  });

  return txn();
}

export function releaseResource(db: SqliteDb, name: string): void {
  const txn = db.transaction(() => {
    const resource = db.prepare(
      "SELECT * FROM resources WHERE name = ?"
    ).get(name) as ResourceRecord | null;

    if (!resource || resource.in_use <= 0) return;

    db.prepare(
      "UPDATE resources SET in_use = in_use - 1, updated_at = ? WHERE name = ?"
    ).run(now(), name);
  });

  txn();
}

export function setResourceCapacity(db: SqliteDb, name: string, capacity: number): void {
  db.prepare(
    "UPDATE resources SET capacity = ?, updated_at = ? WHERE name = ?"
  ).run(capacity, now(), name);
}
