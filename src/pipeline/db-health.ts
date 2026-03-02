import { isDbCorrupt, hasBackup } from "./state-db-backup.js";

/**
 * Result of a database health check.
 */
export interface DbHealthResult {
  healthy: boolean;
  corrupt: boolean;
  backupAvailable: boolean;
  /** Actionable message for the user. Empty string if healthy. */
  message: string;
}

/**
 * Check the health of the state database.
 *
 * Used by `dark status` to detect corruption and suggest remediation.
 *
 * @param dfDir - Path to the .df directory
 * @returns Health check result with actionable messaging
 */
export function checkDbHealth(dfDir: string): DbHealthResult {
  const corrupt = isDbCorrupt(dfDir);
  const backupAvailable = hasBackup(dfDir);

  if (!corrupt) {
    return {
      healthy: true,
      corrupt: false,
      backupAvailable,
      message: "",
    };
  }

  let message: string;
  if (backupAvailable) {
    message =
      "WARNING: State DB appears corrupt or missing. " +
      "A backup is available. Run the following to restore:\n" +
      "  cp .df/state.db.backup .df/state.db\n" +
      "Or use the built-in restore mechanism.";
  } else {
    message =
      "WARNING: State DB appears corrupt or missing. " +
      "No backup is available. You may need to reinitialize with:\n" +
      "  dark init\n" +
      "Spec files in .df/specs/ should be preserved (they are committed to git).";
  }

  return {
    healthy: false,
    corrupt: true,
    backupAvailable,
    message,
  };
}
