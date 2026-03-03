import type { SqliteDb } from "../index.js";
import type { SpecStatus } from "../../types/spec.js";
import { getSpec } from "./specs.js";

/**
 * Valid status transitions for specs.
 * Key = current status, value = array of allowed target statuses.
 *
 * Contract: SpecStatusTransitionAPI
 *
 * Transition rules:
 * - draft → building (build started)
 * - building → completed (build succeeded)
 * - building → draft (build failed, can retry)
 * - any → archived (manual archive)
 * - completed and archived are terminal for forward transitions
 */
export const VALID_TRANSITIONS: Record<SpecStatus, SpecStatus[]> = {
  draft: ["building", "archived"],
  ready: ["building", "archived"],
  building: ["completed", "draft", "archived"],
  completed: ["archived"],
  archived: [],
};

/**
 * Check whether a status transition is valid.
 */
export function isValidTransition(from: SpecStatus, to: SpecStatus): boolean {
  if (from === to) return false;
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Result of a spec status transition attempt.
 */
export interface TransitionResult {
  success: boolean;
  previousStatus?: SpecStatus;
  newStatus?: SpecStatus;
  error?: string;
}

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Attempt to transition a spec's status, validating against the allowed transitions.
 * Returns a TransitionResult indicating success or failure with details.
 *
 * Contract: SpecStatusTransitionAPI
 */
export function transitionSpecStatus(
  db: SqliteDb,
  specId: string,
  targetStatus: SpecStatus,
): TransitionResult {
  const spec = getSpec(db, specId);
  if (!spec) {
    return {
      success: false,
      error: `Spec not found: ${specId}`,
    };
  }

  const currentStatus = spec.status as SpecStatus;

  if (!isValidTransition(currentStatus, targetStatus)) {
    return {
      success: false,
      previousStatus: currentStatus,
      error: `Invalid transition: cannot go from '${currentStatus}' to '${targetStatus}'. Allowed transitions from '${currentStatus}': ${VALID_TRANSITIONS[currentStatus].join(", ") || "none"}`,
    };
  }

  // Apply the transition
  db.prepare(
    "UPDATE specs SET status = ?, updated_at = ? WHERE id = ?",
  ).run(targetStatus, now(), specId);

  return {
    success: true,
    previousStatus: currentStatus,
    newStatus: targetStatus,
  };
}
