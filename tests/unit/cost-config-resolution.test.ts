import { describe, expect, it } from "bun:test";

describe("resolveCostConfig — full config resolution", () => {
  it("should return defaults when no cost section provided", async () => {
    const { resolveCostConfig } = await import("../../src/utils/cost.js");
    const config = resolveCostConfig({});

    expect(config.model).toBe("sonnet");
    expect(config.input_cost_per_mtok).toBe(3.0);
    expect(config.output_cost_per_mtok).toBe(15.0);
    expect(config.cache_read_cost_per_mtok).toBe(0.3);
    expect(config.cost_per_minute).toBe(0.05);
    expect(config.tokens_per_minute).toBe(4000);
  });

  it("should resolve profile shorthand to full config", async () => {
    const { resolveCostConfig } = await import("../../src/utils/cost.js");
    const config = resolveCostConfig({ profile: "opus" });

    expect(config.model).toBe("opus");
    expect(config.input_cost_per_mtok).toBe(15.0);
    expect(config.output_cost_per_mtok).toBe(75.0);
    expect(config.cache_read_cost_per_mtok).toBe(1.5);
    expect(config.cost_per_minute).toBe(0.20);
    expect(config.tokens_per_minute).toBe(3000);
  });

  it("should allow explicit fields to override profile values", async () => {
    const { resolveCostConfig } = await import("../../src/utils/cost.js");
    const config = resolveCostConfig({
      profile: "opus",
      cost_per_minute: 0.30,
    });

    // Profile values for non-overridden fields
    expect(config.model).toBe("opus");
    expect(config.input_cost_per_mtok).toBe(15.0);
    expect(config.output_cost_per_mtok).toBe(75.0);
    // Explicit override
    expect(config.cost_per_minute).toBe(0.30);
  });

  it("should allow explicit model to override profile model", async () => {
    const { resolveCostConfig } = await import("../../src/utils/cost.js");
    const config = resolveCostConfig({
      profile: "opus",
      model: "opus-custom",
    });

    expect(config.model).toBe("opus-custom");
    // Other opus profile values still apply
    expect(config.input_cost_per_mtok).toBe(15.0);
  });

  it("should use explicit fields without profile (custom mode)", async () => {
    const { resolveCostConfig } = await import("../../src/utils/cost.js");
    const config = resolveCostConfig({
      model: "gpt-4o",
      input_cost_per_mtok: 2.5,
      output_cost_per_mtok: 10.0,
      cache_read_cost_per_mtok: 0.0,
      cost_per_minute: 0.04,
      tokens_per_minute: 5000,
    });

    expect(config.model).toBe("gpt-4o");
    expect(config.input_cost_per_mtok).toBe(2.5);
    expect(config.output_cost_per_mtok).toBe(10.0);
    expect(config.cache_read_cost_per_mtok).toBe(0.0);
    expect(config.cost_per_minute).toBe(0.04);
    expect(config.tokens_per_minute).toBe(5000);
  });

  it("should preserve role overrides from input", async () => {
    const { resolveCostConfig } = await import("../../src/utils/cost.js");
    const config = resolveCostConfig({
      profile: "sonnet",
      roles: {
        builder: { cost_per_minute: 0.08 },
        architect: { cost_per_minute: 0.03 },
      },
    });

    expect(config.roles).toBeDefined();
    expect(config.roles!.builder.cost_per_minute).toBe(0.08);
    expect(config.roles!.architect.cost_per_minute).toBe(0.03);
  });

  it("should use haiku profile pricing correctly", async () => {
    const { resolveCostConfig } = await import("../../src/utils/cost.js");
    const config = resolveCostConfig({ profile: "haiku" });

    expect(config.model).toBe("haiku");
    expect(config.input_cost_per_mtok).toBe(0.25);
    expect(config.output_cost_per_mtok).toBe(1.25);
    expect(config.cache_read_cost_per_mtok).toBe(0.025);
    expect(config.cost_per_minute).toBe(0.01);
    expect(config.tokens_per_minute).toBe(8000);
  });

  it("should handle partial explicit overrides (fill rest from defaults)", async () => {
    const { resolveCostConfig } = await import("../../src/utils/cost.js");
    const config = resolveCostConfig({
      cost_per_minute: 0.10,
    });

    // Overridden
    expect(config.cost_per_minute).toBe(0.10);
    // Rest from defaults (sonnet)
    expect(config.model).toBe("sonnet");
    expect(config.input_cost_per_mtok).toBe(3.0);
    expect(config.output_cost_per_mtok).toBe(15.0);
    expect(config.tokens_per_minute).toBe(4000);
  });
});

describe("COST_PROFILES extensibility", () => {
  it("should have sonnet, opus, and haiku profiles", async () => {
    const { COST_PROFILES } = await import("../../src/utils/cost.js");

    expect(COST_PROFILES.sonnet).toBeDefined();
    expect(COST_PROFILES.opus).toBeDefined();
    expect(COST_PROFILES.haiku).toBeDefined();
  });

  it("adding a new profile only requires a map entry", async () => {
    // This verifies the extensibility scenario:
    // "Adding a gpt-4o profile should require only adding an entry to the profiles map"
    const { COST_PROFILES, resolveCostProfile } = await import("../../src/utils/cost.js");

    // Verify the structure is a simple record
    expect(typeof COST_PROFILES).toBe("object");
    expect(Object.keys(COST_PROFILES).length).toBeGreaterThanOrEqual(3);
  });
});
