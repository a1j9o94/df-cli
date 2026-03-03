import type { SqliteDb } from "../index.js";
import type { SpecRecord, SpecStatus } from "../../types/index.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Valid status transitions for specs.
 * Key: current status, Value: set of valid target statuses.
 */
const VALID_TRANSITIONS: Record<SpecStatus, Set<SpecStatus>> = {
  draft: new Set(["building", "archived"]),
  ready: new Set(["building", "archived"]),
  building: new Set(["completed", "draft", "archived"]),
  completed: new Set(["archived"]),
  archived: new Set(), // Terminal state — no transitions out
};

export interface StatusTransitionResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate whether a status transition is allowed.
 */
export function validateStatusTransition(
  from: SpecStatus,
  to: SpecStatus,
): StatusTransitionResult {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) {
    return {
      valid: false,
      reason: `Cannot transition from '${from}' to '${to}'. Allowed transitions from '${from}': ${
        allowed && allowed.size > 0 ? [...allowed].join(", ") : "none (terminal state)"
      }`,
    };
  }
  return { valid: true };
}

/**
 * Create a new spec derived from an existing parent spec.
 * Sets parent_spec_id to reference the source.
 */
export function createSpecFrom(
  db: SqliteDb,
  id: string,
  title: string,
  filePath: string,
  parentSpecId: string,
): SpecRecord {
  // Verify parent exists
  const parent = db.prepare("SELECT id FROM specs WHERE id = ?").get(parentSpecId) as { id: string } | null;
  if (!parent) {
    throw new Error(`Parent spec not found: ${parentSpecId}`);
  }

  const ts = now();
  db.prepare(
    `INSERT INTO specs (id, title, status, file_path, parent_spec_id, created_at, updated_at)
     VALUES (?, ?, 'draft', ?, ?, ?, ?)`,
  ).run(id, title, filePath, parentSpecId, ts, ts);

  return db.prepare("SELECT * FROM specs WHERE id = ?").get(id) as SpecRecord;
}

/**
 * Get all direct children of a spec (specs whose parent_spec_id matches).
 */
export function getSpecChildren(db: SqliteDb, specId: string): SpecRecord[] {
  return db.prepare(
    "SELECT * FROM specs WHERE parent_spec_id = ? ORDER BY created_at ASC",
  ).all(specId) as SpecRecord[];
}

/**
 * Get the full lineage chain for a spec, from root ancestor down to the given spec.
 * Returns null if the spec doesn't exist.
 * Returns an array ordered root-first: [root, ..., parent, spec].
 */
export function getSpecLineage(db: SqliteDb, specId: string): SpecRecord[] | null {
  const spec = db.prepare("SELECT * FROM specs WHERE id = ?").get(specId) as SpecRecord | null;
  if (!spec) {
    return null;
  }

  // Walk up the parent chain
  const chain: SpecRecord[] = [spec];
  let current = spec;
  while (current.parent_spec_id) {
    const parent = db.prepare("SELECT * FROM specs WHERE id = ?").get(current.parent_spec_id) as SpecRecord | null;
    if (!parent) {
      break; // Orphaned reference — stop walking
    }
    chain.unshift(parent); // Add to front for root-first ordering
    current = parent;
  }

  return chain;
}

/**
 * Archive a spec (set status to 'archived').
 * Any status can transition to archived.
 */
export function archiveSpec(db: SqliteDb, specId: string): void {
  const spec = db.prepare("SELECT * FROM specs WHERE id = ?").get(specId) as SpecRecord | null;
  if (!spec) {
    throw new Error(`Spec not found: ${specId}`);
  }

  db.prepare(
    "UPDATE specs SET status = 'archived', updated_at = ? WHERE id = ?",
  ).run(now(), specId);
}
