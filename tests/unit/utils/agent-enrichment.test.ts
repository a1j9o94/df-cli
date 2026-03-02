import { describe, test, expect } from "bun:test";
import {
  computeElapsedMs,
  estimateCost,
  summarizeAgentCounts,
} from "../../../src/utils/agent-enrichment.js";
import type { AgentRecord } from "../../../src/types/agent.js";

describe("computeElapsedMs", () => {
  test("returns milliseconds from created_at to now for running agent", () => {
    const tenSecsAgo = new Date(Date.now() - 10000).toISOString();
    const elapsed = computeElapsedMs(tenSecsAgo, "running");
    // Allow 100ms tolerance for test execution
    expect(elapsed).toBeGreaterThan(9900);
    expect(elapsed).toBeLessThan(10200);
  });

  test("returns 0 for completed agent", () => {
    const tenSecsAgo = new Date(Date.now() - 10000).toISOString();
    // For completed agents, we report total_active_ms instead, so return 0 here
    expect(computeElapsedMs(tenSecsAgo, "completed")).toBe(0);
  });

  test("returns elapsed for spawning agent", () => {
    const fiveSecsAgo = new Date(Date.now() - 5000).toISOString();
    const elapsed = computeElapsedMs(fiveSecsAgo, "spawning");
    expect(elapsed).toBeGreaterThan(4900);
    expect(elapsed).toBeLessThan(5200);
  });

  test("returns elapsed for pending agent", () => {
    const threeSecsAgo = new Date(Date.now() - 3000).toISOString();
    const elapsed = computeElapsedMs(threeSecsAgo, "pending");
    expect(elapsed).toBeGreaterThan(2900);
    expect(elapsed).toBeLessThan(3200);
  });
});

describe("estimateCost", () => {
  test("estimates cost from elapsed time using default rate", () => {
    // Default rate: $0.05 per minute
    const cost = estimateCost(60000); // 1 minute
    expect(cost).toBeCloseTo(0.05, 2);
  });

  test("estimates cost with custom rate", () => {
    const cost = estimateCost(120000, 0.10); // 2 min at $0.10/min
    expect(cost).toBeCloseTo(0.20, 2);
  });

  test("returns 0 for 0 elapsed", () => {
    expect(estimateCost(0)).toBe(0);
  });
});

describe("summarizeAgentCounts", () => {
  test("counts agents by status category", () => {
    const agents = [
      { status: "running" },
      { status: "pending" },
      { status: "completed" },
      { status: "completed" },
      { status: "failed" },
      { status: "killed" },
    ] as AgentRecord[];

    const counts = summarizeAgentCounts(agents);
    expect(counts.active).toBe(2); // running + pending
    expect(counts.completed).toBe(2);
    expect(counts.dead).toBe(2); // failed + killed
  });

  test("handles empty array", () => {
    const counts = summarizeAgentCounts([]);
    expect(counts.active).toBe(0);
    expect(counts.completed).toBe(0);
    expect(counts.dead).toBe(0);
  });

  test("formats summary string", () => {
    const agents = [
      { status: "running" },
      { status: "completed" },
      { status: "failed" },
    ] as AgentRecord[];

    const counts = summarizeAgentCounts(agents);
    expect(counts.summary).toBe("1 active, 1 completed, 1 dead");
  });
});
