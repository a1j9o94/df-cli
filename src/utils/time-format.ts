/**
 * Format a duration in milliseconds as a human-readable elapsed string.
 * Examples: "5s", "1m 30s", "2h 3m 4s"
 */
export function formatElapsed(ms: number): string {
  if (ms <= 0) return "0s";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Format an ISO timestamp as a relative time string.
 * Examples: "just now", "30s ago", "2m ago", "1h ago"
 * Returns "never" for null input.
 */
export function formatRelativeTime(isoTimestamp: string | null): string {
  if (isoTimestamp === null) return "never";

  const diffMs = Date.now() - new Date(isoTimestamp).getTime();

  if (diffMs < 5000) return "just now";

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60);

  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${totalSeconds}s ago`;
}
