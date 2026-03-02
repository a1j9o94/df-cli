import { copyFileSync, existsSync, readFileSync, unlinkSync, statSync } from "node:fs";
import { join } from "node:path";

const BACKUP_FILENAME = "state.db.backup";
const SQLITE_MAGIC = "SQLite format 3";

export interface BackupResult {
  success: boolean;
  error?: string;
}

/**
 * Create a backup of the state.db file before a merge operation.
 * The backup is stored as state.db.backup in the same directory.
 */
export function backupStateDb(dfDir: string): BackupResult {
  const dbPath = join(dfDir, "state.db");
  const backupPath = join(dfDir, BACKUP_FILENAME);

  if (!existsSync(dbPath)) {
    return {
      success: false,
      error: `State DB not found at ${dbPath}`,
    };
  }

  try {
    copyFileSync(dbPath, backupPath);
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to create backup: ${err.message ?? String(err)}`,
    };
  }
}

/**
 * Restore state.db from its backup file.
 * Used when a merge corrupts the database.
 */
export function restoreStateDb(dfDir: string): BackupResult {
  const dbPath = join(dfDir, "state.db");
  const backupPath = join(dfDir, BACKUP_FILENAME);

  if (!existsSync(backupPath)) {
    return {
      success: false,
      error: `No backup found at ${backupPath}`,
    };
  }

  try {
    copyFileSync(backupPath, dbPath);
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to restore from backup: ${err.message ?? String(err)}`,
    };
  }
}

/**
 * Remove the backup file after a successful merge.
 */
export function removeBackup(dfDir: string): void {
  const backupPath = join(dfDir, BACKUP_FILENAME);
  if (existsSync(backupPath)) {
    try {
      unlinkSync(backupPath);
    } catch {
      /* best effort */
    }
  }
}

/**
 * Check whether a backup exists.
 */
export function hasBackup(dfDir: string): boolean {
  return existsSync(join(dfDir, BACKUP_FILENAME));
}

/**
 * Check if the state.db appears corrupt.
 *
 * A SQLite database should:
 * 1. Exist
 * 2. Not be empty
 * 3. Start with the SQLite magic header "SQLite format 3\0"
 */
export function isDbCorrupt(dfDir: string): boolean {
  const dbPath = join(dfDir, "state.db");

  if (!existsSync(dbPath)) {
    return true;
  }

  try {
    const stat = statSync(dbPath);
    if (stat.size === 0) {
      return true;
    }

    // Read just the first 16 bytes to check the SQLite header
    const header = readFileSync(dbPath, { encoding: "utf-8", flag: "r" }).slice(0, SQLITE_MAGIC.length);
    if (header !== SQLITE_MAGIC) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}
