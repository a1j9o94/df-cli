import { describe, expect, test } from "bun:test";
import {
  formatElapsed,
  formatRelativeTime,
  formatCost,
  formatTokens,
  formatFilesChanged,
  formatModuleProgress,
} from "../../../src/utils/format.js";

describe("formatElapsed", () => {
  test("returns '0s' for just-created timestamps", () => {
    const now = new Date().toISOString();
    const result = formatElapsed(now);
    expect(result).toMatch(/^\d+s$/);
  });

  test("returns seconds for elapsed < 60s", () => {
    const thirtySecsAgo = new Date(Date.now() - 30_000).toISOString();
    const result = formatElapsed(thirtySecsAgo);
    // Should be something like "30s" (within a small tolerance)
    expect(result).toMatch(/^\d+s$/);
    const secs = parseInt(result);
    expect(secs).toBeGreaterThanOrEqual(29);
    expect(secs).toBeLessThanOrEqual(32);
  });

  test("returns minutes and seconds for elapsed between 1-60 minutes", () => {
    const twelveMinsAgo = new Date(Date.now() - 12 * 60_000 - 34_000).toISOString();
    const result = formatElapsed(twelveMinsAgo);
    expect(result).toMatch(/^\d+m \d+s$/);
    expect(result).toContain("12m");
  });

  test("returns hours and minutes for elapsed > 60 minutes", () => {
    const ninetyMinsAgo = new Date(Date.now() - 90 * 60_000).toISOString();
    const result = formatElapsed(ninetyMinsAgo);
    expect(result).toMatch(/^\d+h \d+m$/);
    expect(result).toContain("1h");
    expect(result).toContain("30m");
  });

  test("returns 0s for future timestamps", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const result = formatElapsed(future);
    expect(result).toBe("0s");
  });

  test("handles exact minute boundary", () => {
    const exactlyOneMin = new Date(Date.now() - 60_000).toISOString();
    const result = formatElapsed(exactlyOneMin);
    expect(result).toMatch(/^1m \d+s$/);
  });

  test("handles exact hour boundary", () => {
    const exactlyOneHour = new Date(Date.now() - 3600_000).toISOString();
    const result = formatElapsed(exactlyOneHour);
    expect(result).toMatch(/^1h 0m$/);
  });
});

describe("formatRelativeTime", () => {
  test("returns 'never' for null input", () => {
    expect(formatRelativeTime(null)).toBe("never");
  });

  test("returns 'just now' for timestamps < 10 seconds ago", () => {
    const recent = new Date(Date.now() - 5_000).toISOString();
    expect(formatRelativeTime(recent)).toBe("just now");
  });

  test("returns seconds ago for 10-59 seconds", () => {
    const thirtySecsAgo = new Date(Date.now() - 30_000).toISOString();
    const result = formatRelativeTime(thirtySecsAgo);
    expect(result).toMatch(/^\d+s ago$/);
  });

  test("returns minutes ago for 1-59 minutes", () => {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const result = formatRelativeTime(fiveMinsAgo);
    expect(result).toMatch(/^\d+m ago$/);
    expect(result).toContain("5m");
  });

  test("returns hours ago for 1-23 hours", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600_000).toISOString();
    const result = formatRelativeTime(threeHoursAgo);
    expect(result).toMatch(/^\d+h ago$/);
    expect(result).toContain("3h");
  });

  test("returns days ago for 24+ hours", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400_000).toISOString();
    const result = formatRelativeTime(twoDaysAgo);
    expect(result).toMatch(/^\d+d ago$/);
    expect(result).toContain("2d");
  });
});

describe("formatCost", () => {
  test("formats zero cost", () => {
    expect(formatCost(0)).toBe("$0.00");
  });

  test("formats fractional cost", () => {
    expect(formatCost(0.62)).toBe("$0.62");
  });

  test("formats whole dollar cost", () => {
    expect(formatCost(1.33)).toBe("$1.33");
  });

  test("formats large cost", () => {
    expect(formatCost(15.0)).toBe("$15.00");
  });

  test("rounds to 2 decimal places", () => {
    expect(formatCost(1.999)).toBe("$2.00");
  });
});

describe("formatTokens", () => {
  test("formats small numbers without commas", () => {
    expect(formatTokens(500)).toBe("500");
  });

  test("formats thousands with commas", () => {
    expect(formatTokens(15234)).toBe("15,234");
  });

  test("formats millions with commas", () => {
    expect(formatTokens(1000000)).toBe("1,000,000");
  });

  test("formats zero", () => {
    expect(formatTokens(0)).toBe("0");
  });
});

describe("formatFilesChanged", () => {
  test("formats zero files", () => {
    expect(formatFilesChanged(0)).toBe("0 files");
  });

  test("formats single file", () => {
    expect(formatFilesChanged(1)).toBe("1 file");
  });

  test("formats multiple files", () => {
    expect(formatFilesChanged(3)).toBe("3 files");
  });
});

describe("formatModuleProgress", () => {
  test("formats completed module", () => {
    const result = formatModuleProgress([
      { name: "merge-lock", status: "completed", elapsed: undefined },
    ]);
    expect(result).toContain("merge-lock");
    expect(result).toContain("done");
  });

  test("formats building module with elapsed time", () => {
    const result = formatModuleProgress([
      { name: "engine-rebase", status: "running", elapsed: "12m 34s" },
    ]);
    expect(result).toContain("engine-rebase");
    expect(result).toContain("building");
    expect(result).toContain("12m 34s");
  });

  test("formats pending module", () => {
    const result = formatModuleProgress([
      { name: "queue-vis", status: "pending", elapsed: undefined },
    ]);
    expect(result).toContain("queue-vis");
    expect(result).toContain("pending");
  });

  test("formats failed module", () => {
    const result = formatModuleProgress([
      { name: "broken-mod", status: "failed", elapsed: "5m 0s" },
    ]);
    expect(result).toContain("broken-mod");
    expect(result).toContain("failed");
  });

  test("formats multiple modules on one line", () => {
    const result = formatModuleProgress([
      { name: "merge-lock", status: "completed", elapsed: undefined },
      { name: "engine-rebase", status: "running", elapsed: "12m 34s" },
      { name: "queue-vis", status: "running", elapsed: "11m 0s" },
    ]);
    expect(result).toContain("merge-lock");
    expect(result).toContain("engine-rebase");
    expect(result).toContain("queue-vis");
  });

  test("returns empty string for empty array", () => {
    expect(formatModuleProgress([])).toBe("");
  });
});
