import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { SqliteDb } from "../db/index.js";
import type { SpecStatus, SpecRecord, RunRecord } from "../types/index.js";
import { getSpec, updateSpecStatus } from "../db/queries/specs.js";

/**
 * Valid spec status transitions.
 * Defined per contract SpecStatusTransitionAPI:
 *   draft->building, building->completed, building->draft,
 *   draft->archived, ready->building, ready->archived, completed->archived.
 * All others are INVALID.
 */
const VALID_TRANSITIONS: ReadonlySet<string> = new Set([
  "draft->building",
  "building->completed",
  "building->draft",
  "draft->archived",
  "ready->building",
  "ready->archived",
  "completed->archived",
]);

/**
 * Validate a spec status transition.
 * Returns true if valid, throws an error if invalid.
 */
export function validateStatusTransition(current: SpecStatus, next: SpecStatus): boolean {
  const key = `${current}->${next}`;
  if (!VALID_TRANSITIONS.has(key)) {
    throw new Error(
      `Invalid spec status transition: ${current} -> ${next}. ` +
      `Valid transitions from '${current}': ${getValidNextStatuses(current).join(", ") || "none"}`
    );
  }
  return true;
}

/**
 * Update spec status with transition validation.
 * Throws if spec not found or transition is invalid.
 */
export function updateSpecStatusChecked(db: SqliteDb, id: string, newStatus: SpecStatus): void {
  const spec = getSpec(db, id);
  if (!spec) {
    throw new Error(`Spec not found: ${id}`);
  }
  validateStatusTransition(spec.status, newStatus);
  updateSpecStatus(db, id, newStatus);
}

/**
 * Compute SHA-256 content hash of a file.
 * Returns lowercase hex string.
 */
export function computeContentHash(filePath: string): string {
  const content = readFileSync(filePath, "utf-8");
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Get the latest (most recent) run for a given spec ID.
 * Returns null if no runs exist for the spec.
 */
export function getLatestRunForSpec(db: SqliteDb, specId: string): RunRecord | null {
  return db.prepare(
    "SELECT * FROM runs WHERE spec_id = ? ORDER BY created_at DESC, id DESC LIMIT 1"
  ).get(specId) as RunRecord | null;
}

/**
 * Helper: get valid next statuses from a given status.
 */
function getValidNextStatuses(current: SpecStatus): SpecStatus[] {
  const results: SpecStatus[] = [];
  for (const transition of VALID_TRANSITIONS) {
    const [from, to] = transition.split("->") as [string, SpecStatus];
    if (from === current) {
      results.push(to);
    }
  }
  return results;
}
