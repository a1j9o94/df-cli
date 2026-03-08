/**
 * Check if a process with the given PID is still alive.
 * Sending signal 0 checks existence without actually killing the process.
 */
export function isProcessAlive(pid: number | null): boolean {
  if (pid === null) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
