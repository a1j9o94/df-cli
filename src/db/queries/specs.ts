import type { SqliteDb } from "../index.js";
import type { SpecRecord } from "../../types/index.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function createSpec(db: SqliteDb, id: string, title: string, filePath: string): SpecRecord {
  const ts = now();

  db.prepare(
    `INSERT INTO specs (id, title, status, file_path, created_at, updated_at)
     VALUES (?, ?, 'draft', ?, ?, ?)`
  ).run(id, title, filePath, ts, ts);

  return getSpec(db, id)!;
}

export function getSpec(db: SqliteDb, id: string): SpecRecord | null {
  return db.prepare("SELECT * FROM specs WHERE id = ?").get(id) as SpecRecord | null;
}

export function listSpecs(db: SqliteDb, status?: string): SpecRecord[] {
  if (status) {
    return db.prepare("SELECT * FROM specs WHERE status = ? ORDER BY created_at DESC").all(status) as SpecRecord[];
  }
  return db.prepare("SELECT * FROM specs ORDER BY created_at DESC").all() as SpecRecord[];
}

export function updateSpecStatus(db: SqliteDb, id: string, status: string): void {
  db.prepare(
    "UPDATE specs SET status = ?, updated_at = ? WHERE id = ?"
  ).run(status, now(), id);
}

export function updateSpecHash(db: SqliteDb, id: string, hash: string): void {
  db.prepare(
    "UPDATE specs SET content_hash = ?, updated_at = ? WHERE id = ?"
  ).run(hash, now(), id);
}
