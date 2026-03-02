// src/utils/state-backup.ts
// Implements the state-db-backup contract (ctr_01KJQ41BZBRRCY0KEJRRT36PT5)
import { copyFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

export const STATE_DB_BACKUP_FILENAME = "state.db.backup";

export function getBackupPath(dfDir: string): string {
  return join(dfDir, STATE_DB_BACKUP_FILENAME);
}

export function backupStateDb(dfDir: string): void {
  const dbPath = join(dfDir, "state.db");
  const backupPath = getBackupPath(dfDir);
  copyFileSync(dbPath, backupPath);
}

export function restoreStateDb(dfDir: string): boolean {
  const dbPath = join(dfDir, "state.db");
  const backupPath = getBackupPath(dfDir);
  if (!existsSync(backupPath)) return false;
  copyFileSync(backupPath, dbPath);
  return true;
}

export function removeBackup(dfDir: string): void {
  const backupPath = getBackupPath(dfDir);
  if (existsSync(backupPath)) unlinkSync(backupPath);
}

export function backupExists(dfDir: string): boolean {
  return existsSync(getBackupPath(dfDir));
}
