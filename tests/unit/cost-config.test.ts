import { describe, expect, it } from "bun:test";

describe("CostConfig types and defaults", () => {
  it("should export DEFAULT_COST_CONFIG with Sonnet pricing defaults", async () => {
    const { DEFAULT_COST_CONFIG } = await import("../../src/types/config.js");

    expect(DEFAULT_COST_CONFIG).toBeDefined();
    expect(DEFAULT_COST_CONFIG.model).toBe("sonnet");
    expect(DEFAULT_COST_CONFIG.input_cost_per_mtok).toBe(3.0);
    expect(DEFAULT_COST_CONFIG.output_cost_per_mtok).toBe(15.0);
    expect(DEFAULT_COST_CONFIG.cache_read_cost_per_mtok).toBe(0.3);
    expect(DEFAULT_COST_CONFIG.cost_per_minute).toBe(0.05);
    expect(DEFAULT_COST_CONFIG.tokens_per_minute).toBe(4000);
  });

  it("should have no role overrides by default", async () => {
    const { DEFAULT_COST_CONFIG } = await import("../../src/types/config.js");

    expect(DEFAULT_COST_CONFIG.roles).toBeUndefined();
  });

  it("should include cost section in DEFAULT_CONFIG", async () => {
    const { DEFAULT_CONFIG } = await import("../../src/types/config.js");

    expect(DEFAULT_CONFIG.cost).toBeDefined();
    expect(DEFAULT_CONFIG.cost.model).toBe("sonnet");
    expect(DEFAULT_CONFIG.cost.cost_per_minute).toBe(0.05);
    expect(DEFAULT_CONFIG.cost.tokens_per_minute).toBe(4000);
  });
});
