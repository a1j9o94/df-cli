// --- Contract: ErrorTrackerShape ---

export interface ErrorEntry {
  timestamp: string;
  path: string;
  method: string;
  error: string;
  stack: string;
}

export class ErrorTracker {
  private errors: ErrorEntry[] = [];

  capture(err: Error | unknown, path: string, method: string): void {
    const error = err instanceof Error ? err : new Error(String(err));
    this.errors.push({
      timestamp: new Date().toISOString(),
      path,
      method,
      error: error.message,
      stack: error.stack ?? "",
    });
  }

  getErrors(): ErrorEntry[] {
    return [...this.errors];
  }

  getErrorCount(): number {
    return this.errors.length;
  }
}
// error-tracking module complete
