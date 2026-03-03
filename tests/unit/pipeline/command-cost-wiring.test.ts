/**
 * Verifies that every agent command imports and calls estimateAndRecordCost.
 * This is a structural test — it reads source files to confirm wiring.
 */
import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC_ROOT = join(import.meta.dir, "../../../src");

const COMMANDS_THAT_MUST_TRACK_COST = [
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
  for (const cmdPath of COMMANDS_THAT_MUST_TRACK_COST) {
    test(`${cmdPath} imports estimateAndRecordCost`, () => {
      const source = readFileSync(join(SRC_ROOT, cmdPath), "utf-8");
      expect(source).toContain("estimateAndRecordCost");
    });

    test(`${cmdPath} calls estimateAndRecordCost`, () => {
      const source = readFileSync(join(SRC_ROOT, cmdPath), "utf-8");
      // Should import it
      expect(source).toMatch(/import.*estimateAndRecordCost.*from.*budget/);
      // Should call it (not just import)
      const importLine = source.split("\n").find(l => l.includes("import") && l.includes("estimateAndRecordCost"));
      const nonImportUsage = source.split("\n").filter(l =>
        l.includes("estimateAndRecordCost") && !l.includes("import")
      );
      expect(nonImportUsage.length).toBeGreaterThan(0);
    });
  }
});
