/**
 * Tests that engine-side estimateCostIfMissing has been removed from
 * agent-lifecycle.ts and build-phase.ts.
 *
 * Per spec: "Remove estimateCostIfMissing from the engine entirely.
 * Cost tracking is now handled at the command layer."
 *
 * The ONLY remaining engine-side cost estimation should be for crashed
 * agents (those that never got a chance to call back).
 */
import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(import.meta.dir, "../../../src");

describe("engine-side estimateCostIfMissing removal", () => {
  test("build-phase.ts does not define estimateCostIfMissing", () => {
    const content = readFileSync(join(SRC_DIR, "pipeline/build-phase.ts"), "utf-8");
    // Should not define its own estimateCostIfMissing function
    expect(content).not.toMatch(/function\s+estimateCostIfMissing/);
  });

  test("build-phase.ts does not call estimateCostIfMissing", () => {
    const content = readFileSync(join(SRC_DIR, "pipeline/build-phase.ts"), "utf-8");
    // Should not call estimateCostIfMissing anywhere
    expect(content).not.toMatch(/estimateCostIfMissing\s*\(/);
  });

  test("agent-lifecycle.ts does not export estimateCostIfMissing", () => {
    const content = readFileSync(join(SRC_DIR, "pipeline/agent-lifecycle.ts"), "utf-8");
    // Should not export estimateCostIfMissing
    expect(content).not.toMatch(/export\s+function\s+estimateCostIfMissing/);
  });

  test("agent-lifecycle.ts does not call estimateCostIfMissing in executeAgentPhase", () => {
    const content = readFileSync(join(SRC_DIR, "pipeline/agent-lifecycle.ts"), "utf-8");
    // The executeAgentPhase function should not call estimateCostIfMissing
    expect(content).not.toMatch(/estimateCostIfMissing\s*\(\s*db\s*,\s*finalAgent\s*\)/);
  });
});
