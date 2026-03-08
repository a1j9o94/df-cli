/**
 * In-memory request logger with circular buffer.
 * Stores the last N requests (default: 1000) and serves the last 100 via GET /api/logs.
 */

export interface LogEntry {
  method: string;
  path: string;
  status: number;
  duration: number;
  timestamp: string;
}

export class RequestLogger {
  private entries: LogEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Log a request.
   */
  log(entry: LogEntry): void {
    this.entries.push(entry);
    // Keep buffer bounded
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  /**
   * Get the last N log entries (default: 100), most recent first.
   */
  getRecent(count = 100): LogEntry[] {
    const start = Math.max(0, this.entries.length - count);
    return this.entries.slice(start).reverse();
  }
}
