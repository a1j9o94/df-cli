import { describe, test, expect } from "bun:test";
import type { AgentStatus } from "../../../src/types/index.js";

describe("AgentStatus includes paused", () => {
  test("AgentStatus type accepts 'paused'", () => {
    // This test verifies at the type level that 'paused' is a valid AgentStatus.
    // If it compiles, the type is correct. Runtime check for safety:
    const status: AgentStatus = "paused";
    expect(status).toBe("paused");
  });
});
