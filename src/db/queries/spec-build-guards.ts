import type { SqliteDb } from "../index.js";
import type { SpecStatus } from "../../types/spec.js";
import { getSpec, updateSpecHash } from "./specs.js";
import { transitionSpecStatus } from "./spec-transitions.js";
import { computeContentHash, checkContentHash } from "./spec-extensions.js";

/**
 * Result of checking whether a spec can be built.
 */
export interface BuildGuardResult {
  allowed: boolean;
  reason?: string;
  suggestion?: string;
  warning?: string;
  contentChanged?: boolean;
}

/**
 * Terminal statuses that cannot be built.
 */
const TERMINAL_STATUSES: SpecStatus[] = ["completed", "archived"];

/**
 * Check whether a spec is eligible to be built.
 *
 * Guard 1: Rejects completed/archived specs.
 * Guard 2: Warns if content hash has changed since last build.
 * --force bypasses the content hash warning but NOT terminal status rejection.
 *
 * This is a read-only check — it does not modify the spec.
 */
export function canBuildSpec(
  db: SqliteDb,
  specId: string,
  currentContent: string,
  force: boolean,
): BuildGuardResult {
  const spec = getSpec(db, specId);
  if (!spec) {
    return {
      allowed: false,
      reason: `Spec not found: ${specId}`,
    };
  }

  // Guard 1: Terminal status check (force does NOT bypass this)
  if (TERMINAL_STATUSES.includes(spec.status)) {
    return {
      allowed: false,
      reason: `Spec ${specId} is already ${spec.status}. To build something new, create a new spec.`,
      suggestion: `dark spec create "Follow-up: <description>"`,
      contentChanged: false,
    };
  }

  // Guard 2: Content hash check (force bypasses this)
  if (!force) {
    const hashCheck = checkContentHash(db, specId, currentContent);
    if (!hashCheck.match && !hashCheck.firstBuild) {
      return {
        allowed: true,
        contentChanged: true,
        warning: `Spec file has been modified since the last build. The original spec produced a previous run. If this is intentional, use:\n  dark spec create "Updated: <title>"\nTo build against the modified spec as a NEW spec, or:\n  dark build --force`,
      };
    }
  }

  return {
    allowed: true,
    contentChanged: false,
  };
}

/**
 * Result of preparing a spec for build.
 */
export interface PrepareForBuildResult {
  success: boolean;
  contentHash?: string;
  error?: string;
}

/**
 * Prepare a spec for building: transition to 'building' status and store the content hash.
 * This is the write operation that should be called after canBuildSpec confirms eligibility.
 *
 * Atomically:
 * 1. Validates and applies the status transition (draft/ready → building)
 * 2. Computes and stores the content hash for future change detection
 */
export function prepareSpecForBuild(
  db: SqliteDb,
  specId: string,
  currentContent: string,
): PrepareForBuildResult {
  const spec = getSpec(db, specId);
  if (!spec) {
    return {
      success: false,
      error: `Spec not found: ${specId}`,
    };
  }

  // Attempt the status transition
  const transition = transitionSpecStatus(db, specId, "building");
  if (!transition.success) {
    return {
      success: false,
      error: transition.error,
    };
  }

  // Store the content hash
  const contentHash = computeContentHash(currentContent);
  updateSpecHash(db, specId, contentHash);

  return {
    success: true,
    contentHash,
  };
}
