import { describe, test, expect } from "bun:test";
import { getWorktreeFilesChanged } from "../../../src/utils/worktree-files.js";

describe("getWorktreeFilesChanged", () => {
  test("returns 0 for null worktree path", () => {
    expect(getWorktreeFilesChanged(null)).toBe(0);
  });

  test("returns 0 for non-existent worktree path", () => {
    expect(getWorktreeFilesChanged("/nonexistent/path/that/does/not/exist")).toBe(0);
  });

  test("returns a number for a valid git worktree (current dir)", () => {
    // Use current directory as a real git repo
    const count = getWorktreeFilesChanged(process.cwd());
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
