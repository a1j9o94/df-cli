import { createHash } from "node:crypto";
import type { SqliteDb } from "../index.js";
import type { SpecRecord } from "../../types/spec.js";
import { getSpec } from "./specs.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Create a spec with an optional parent reference.
 * Used by `dark spec create --from <spec-id>` to establish lineage.
 *
 * Contract: SpecTypeExtensions
 */
export function createSpecWithParent(
  db: SqliteDb,
  id: string,
  title: string,
  filePath: string,
  parentSpecId: string | null,
): SpecRecord {
  const ts = now();

  db.prepare(
    `INSERT INTO specs (id, title, status, file_path, parent_spec_id, created_at, updated_at)
     VALUES (?, ?, 'draft', ?, ?, ?, ?)`,
  ).run(id, title, filePath, parentSpecId, ts, ts);

  return getSpec(db, id)!;
}

/**
 * Get the full lineage chain for a spec, from root ancestor to the given spec.
 * Returns an array ordered from oldest ancestor to the target spec.
 *
 * Contract: SpecTypeExtensions
 */
export function getSpecLineage(db: SqliteDb, specId: string): SpecRecord[] {
  const spec = getSpec(db, specId);
  if (!spec) return [];

  // Walk up the parent chain
  const chain: SpecRecord[] = [spec];
  let current = spec;

  while (current.parent_spec_id) {
    const parent = getSpec(db, current.parent_spec_id);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }

  return chain;
}

/**
 * Compute a SHA-256 content hash for spec file content.
 * Used for detecting spec file modifications between builds.
 *
 * Contract: SpecTypeExtensions
 */
export function computeContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Result of a content hash comparison.
 */
export interface ContentHashCheckResult {
  match: boolean;
  storedHash?: string;
  currentHash?: string;
  firstBuild?: boolean;
  error?: string;
}

/**
 * Check whether a spec's content hash matches the current file content.
 * Returns match=true if no hash is stored (first build) or if hashes match.
 *
 * Contract: SpecTypeExtensions
 */
export function checkContentHash(
  db: SqliteDb,
  specId: string,
  currentContent: string,
): ContentHashCheckResult {
  const spec = getSpec(db, specId);
  if (!spec) {
    return {
      match: false,
      error: `Spec not found: ${specId}`,
    };
  }

  const currentHash = computeContentHash(currentContent);

  // If no hash stored (empty string default), this is a first build
  if (!spec.content_hash || spec.content_hash === "") {
    return {
      match: true,
      storedHash: spec.content_hash,
      currentHash,
      firstBuild: true,
    };
  }

  return {
    match: spec.content_hash === currentHash,
    storedHash: spec.content_hash,
    currentHash,
  };
}
