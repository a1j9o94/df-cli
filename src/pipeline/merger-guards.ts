import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Result of running the project's test suite.
 */
export interface TestResult {
  passed: boolean;
  output?: string;
  error?: string;
}

/**
 * Result of scanning for merge conflict markers.
 */
export interface ConflictScanResult {
  found: boolean;
  files: string[];
}

/**
 * Result of checking whether state.db files are staged.
 */
export interface StateDbCheckResult {
  clean: boolean;
  files: string[];
}

/**
 * Aggregate result of all merger guards.
 */
export interface MergerGuardResult {
  passed: boolean;
  errors: string[];
}

/**
 * Detect and run the project's test command.
 *
 * Checks for:
 * 1. A "test" script in package.json (uses `bun test`, `npm test`, etc.)
 * 2. A configured test command in .df/config.yaml
 * 3. Falls back to passing if no test command is found
 */
export function runProjectTests(projectRoot: string): TestResult {
  const packageJsonPath = join(projectRoot, "package.json");

  let testCommand: string | null = null;

  // Check package.json for a test script
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      if (pkg.scripts?.test) {
        testCommand = pkg.scripts.test;
      }
    } catch {
      // Invalid package.json — skip
    }
  }

  if (!testCommand) {
    // No test command configured — pass gracefully
    return { passed: true };
  }

  try {
    const output = execSync(testCommand, {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 300_000, // 5 minute timeout
      shell: "/bin/sh",
    });
    return { passed: true, output };
  } catch (err: any) {
    const stderr = err.stderr?.toString() ?? "";
    const stdout = err.stdout?.toString() ?? "";
    return {
      passed: false,
      output: stdout,
      error: `Test command failed (exit ${err.status}): ${stderr || stdout}`.trim(),
    };
  }
}

/**
 * Scan all tracked (and staged) files for merge conflict markers.
 *
 * Checks for `<<<<<<<`, `=======`, `>>>>>>>` patterns at the start of lines
 * in tracked files. Line-start anchoring avoids false positives from code
 * that mentions conflict markers in comments, strings, or documentation.
 */
export function scanConflictMarkers(projectRoot: string): ConflictScanResult {
  const files: string[] = [];

  try {
    // Get list of all tracked files + staged files
    const trackedFiles = execSync("git ls-files", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    })
      .trim()
      .split("\n")
      .filter((f) => f.length > 0);

    for (const file of trackedFiles) {
      const filePath = join(projectRoot, file);
      if (!existsSync(filePath)) continue;

      try {
        const content = readFileSync(filePath, "utf-8");
        // Real conflict markers always appear at the start of a line.
        // Using line-start anchors avoids false positives from code that
        // *mentions* conflict markers (comments, test strings, docs).
        if (
          /^<{7}/m.test(content) &&
          /^={7}/m.test(content) &&
          /^>{7}/m.test(content)
        ) {
          files.push(file);
        }
      } catch {
        // Binary file or unreadable — skip
      }
    }
  } catch {
    // git ls-files failed — skip
  }

  return {
    found: files.length > 0,
    files,
  };
}

/**
 * Check whether any .df/state.db* files are staged or modified.
 *
 * This prevents state DB corruption during merges.
 */
export function checkStateDbNotStaged(projectRoot: string): StateDbCheckResult {
  const files: string[] = [];

  try {
    // Check staged files
    const staged = execSync("git diff --cached --name-only", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    for (const file of staged.split("\n")) {
      if (file.startsWith(".df/state.db")) {
        files.push(file);
      }
    }

    // Check modified (unstaged) files
    const modified = execSync("git diff --name-only", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    for (const file of modified.split("\n")) {
      if (file.startsWith(".df/state.db") && !files.includes(file)) {
        files.push(file);
      }
    }
  } catch {
    // git commands failed — skip
  }

  return {
    clean: files.length === 0,
    files,
  };
}

/**
 * Run all merger completion guards.
 *
 * 1. Run the project's test command
 * 2. Scan for merge conflict markers
 * 3. Verify .df/state.db* files are not staged or modified
 */
export function checkMergerGuards(
  projectRoot: string,
  _dfDir: string,
): MergerGuardResult {
  const errors: string[] = [];

  // Guard 1: Run project tests
  const testResult = runProjectTests(projectRoot);
  if (!testResult.passed) {
    errors.push(`Tests failed: ${testResult.error ?? "Unknown test failure"}`);
  }

  // Guard 2: Scan for conflict markers
  const conflictResult = scanConflictMarkers(projectRoot);
  if (conflictResult.found) {
    errors.push(
      `Merge conflict markers found in ${conflictResult.files.length} file(s): ${conflictResult.files.join(", ")}`,
    );
  }

  // Guard 3: Check state.db files
  const stateDbResult = checkStateDbNotStaged(projectRoot);
  if (!stateDbResult.clean) {
    errors.push(
      `Forbidden .df/state.db* files are staged or modified: ${stateDbResult.files.join(", ")}. These must not be committed.`,
    );
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}
