import { describe, test, expect } from "bun:test";
import { formatElapsed, formatRelativeTime } from "../../../src/utils/time-format.js";

describe("formatElapsed", () => {
  test("formats seconds only", () => {
    expect(formatElapsed(5000)).toBe("5s");
    expect(formatElapsed(45000)).toBe("45s");
  });

  test("formats minutes and seconds", () => {
    expect(formatElapsed(60000)).toBe("1m 0s");
    expect(formatElapsed(90000)).toBe("1m 30s");
    expect(formatElapsed(754000)).toBe("12m 34s");
  });

  test("formats hours, minutes, and seconds", () => {
    expect(formatElapsed(3600000)).toBe("1h 0m 0s");
    expect(formatElapsed(3661000)).toBe("1h 1m 1s");
    expect(formatElapsed(7384000)).toBe("2h 3m 4s");
  });

  test("returns 0s for zero or negative", () => {
    expect(formatElapsed(0)).toBe("0s");
    expect(formatElapsed(-1000)).toBe("0s");
  });
});

describe("formatRelativeTime", () => {
  test("returns 'just now' for very recent timestamps", () => {
    const now = new Date();
    expect(formatRelativeTime(now.toISOString())).toBe("just now");
  });

  test("returns seconds ago", () => {
    const thirtySecsAgo = new Date(Date.now() - 30000).toISOString();
    expect(formatRelativeTime(thirtySecsAgo)).toBe("30s ago");
  });

  test("returns minutes ago", () => {
    const twoMinsAgo = new Date(Date.now() - 120000).toISOString();
    expect(formatRelativeTime(twoMinsAgo)).toBe("2m ago");
  });

  test("returns hours ago", () => {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    expect(formatRelativeTime(oneHourAgo)).toBe("1h ago");
  });

  test("returns 'never' for null input", () => {
    expect(formatRelativeTime(null)).toBe("never");
  });
});
