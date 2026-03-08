import { describe, test, expect } from "bun:test";
import { isProcessAlive } from "../../../src/utils/pid-check.js";

describe("isProcessAlive", () => {
  test("returns true for current process PID", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  test("returns false for a non-existent PID", () => {
    // PID 99999999 is extremely unlikely to exist
    expect(isProcessAlive(99999999)).toBe(false);
  });

  test("returns false for null PID", () => {
    expect(isProcessAlive(null)).toBe(false);
  });
});
