import type { SqliteDb } from "../db/index.js";
import { getSpec } from "../db/queries/specs.js";
import type { SpecStatus } from "../types/index.js";

export interface BuildGuardResult {
  allowed: boolean;
  reason?: string;
  suggestion?: string;
  warning?: string;
}

interface BuildGuardOptions {
  /** Current content hash of the spec file on disk */
  currentContentHash?: string;
  /** Skip content hash check */
  force?: boolean;
}

/**
 * Check whether a spec can be built. Implements Guards 1-3 from the spec immutability spec:
 *
 * Guard 1: Refuses completed/archived specs
 * Guard 2: Content hash mismatch warning
 * Guard 3: Status transition validation
 */
export function checkSpecBuildable(
  db: SqliteDb,
  specId: string,
  options?: BuildGuardOptions,
): BuildGuardResult {
  const spec = getSpec(db, specId);

  if (!spec) {
    return {
      allowed: false,
      reason: `Spec not found: ${specId}`,
    };
  }

  // Guard 1: Refuse completed/archived specs
  if (spec.status === "completed") {
    return {
      allowed: false,
      reason: `Spec ${specId} is already completed. To build something new, create a new spec.`,
      suggestion: `dark spec create --from ${specId} "Follow-up: <description>"`,
    };
  }

  if (spec.status === "archived") {
    return {
      allowed: false,
      reason: `Spec ${specId} is archived and cannot be built.`,
      suggestion: `dark spec create --from ${specId} "Follow-up: <description>"`,
    };
  }

  // Guard 2: Content hash mismatch warning
  let warning: string | undefined;
  if (
    options?.currentContentHash &&
    spec.content_hash &&
    spec.content_hash !== "" &&
    spec.content_hash !== options.currentContentHash &&
    !options.force
  ) {
    warning = `Warning: spec file has been modified since the last build. The original spec produced a previous run. If this is intentional, use:\n  dark spec create --from ${specId} "Updated: ${spec.title}"\nTo build against the modified spec as a NEW spec, or:\n  dark build ${specId} --force`;
  }

  // Guard 3: Status transitions - draft and building are both valid starting points
  // (building is valid for retry after failure)
  return {
    allowed: true,
    warning,
  };
}
