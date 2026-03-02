// src/utils/db-health.ts
// Guard 4 (partial): Detect DB corruption and check for backup availability.
// Used by the `dark status` command to gracefully handle corrupt/missing state DB.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { STATE_DB_BACKUP_FILENAME } from "./state-backup.js";

export interface DbHealthCheck {
  isCorrupt: boolean;
  hasBackup: boolean;
  error?: string;
}

/**
 * Check if the state DB at dfDir/state.db is healthy.
 * Returns corruption status and backup availability.
 *
 * @param dfDir - The .df directory path
 */
export function detectDbCorruption(dfDir: string): DbHealthCheck {
  const dbPath = join(dfDir, "state.db");
  const backupPath = join(dfDir, STATE_DB_BACKUP_FILENAME);
  const hasBackup = existsSync(backupPath);

  // Check if DB file exists
  if (!existsSync(dbPath)) {
    return {
      isCorrupt: true,
      hasBackup,
      error: `State DB not found at ${dbPath}`,
    };
  }

  // Try to open and query the DB
  try {
    const db = new Database(dbPath, { readonly: true });
    // Run integrity check
    const result = db.query("PRAGMA integrity_check").get() as { integrity_check: string } | null;
    db.close();

    if (result && result.integrity_check !== "ok") {
      return {
        isCorrupt: true,
        hasBackup,
        error: `Integrity check failed: ${result.integrity_check}`,
      };
    }

    return { isCorrupt: false, hasBackup };
  } catch (err) {
    return {
      isCorrupt: true,
      hasBackup,
      error: `Failed to open state DB: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
