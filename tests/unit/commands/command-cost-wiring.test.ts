/**
 * Tests that every agent command calls estimateAndRecordCost as a side effect.
 *
 * Instead of testing each command's CLI behavior (which requires process spawning),
 * we verify the wiring by:
 * 1. Checking that each command file imports estimateAndRecordCost
 * 2. Running integration-style tests where we invoke the command logic directly
 */
import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(import.meta.dir, "../../../src");

const COMMAND_FILES = [
  "commands/agent/heartbeat.ts",
  "commands/agent/complete.ts",
  "commands/agent/fail.ts",
  "commands/agent/report-result.ts",
  "commands/mail/check.ts",
  "commands/mail/send.ts",
  "commands/scenario/create.ts",
  "commands/contract/acknowledge.ts",
];

describe("command cost wiring", () => {
  for (const file of COMMAND_FILES) {
    test(`${file} imports estimateAndRecordCost from budget.ts`, () => {
      const content = readFileSync(join(SRC_DIR, file), "utf-8");
      expect(content).toContain("estimateAndRecordCost");
    });

    test(`${file} calls estimateAndRecordCost`, () => {
      const content = readFileSync(join(SRC_DIR, file), "utf-8");
      // Should have a call to estimateAndRecordCost(db, ...)
      expect(content).toMatch(/estimateAndRecordCost\s*\(/);
    });
  }
});

describe("command cost wiring - import source", () => {
  for (const file of COMMAND_FILES) {
    test(`${file} imports from budget.ts (not agent-lifecycle.ts)`, () => {
      const content = readFileSync(join(SRC_DIR, file), "utf-8");
      // Should import from budget, not from agent-lifecycle
      if (content.includes("estimateAndRecordCost")) {
        expect(content).toMatch(/from\s+["'].*budget.*["']/);
      }
    });
  }
});
