import { describe, expect, it } from "bun:test";
import type { CostConfig } from "../../src/types/config.js";
import { DEFAULT_COST_CONFIG } from "../../src/types/config.js";

describe("Cost resolution functions", () => {
  describe("resolveCostProfile", () => {
    it("should resolve 'sonnet' profile to Sonnet 4 pricing", async () => {
      const { resolveCostProfile } = await import("../../src/utils/cost.js");
      const config = resolveCostProfile("sonnet");

      expect(config.model).toBe("sonnet");
      expect(config.input_cost_per_mtok).toBe(3.0);
      expect(config.output_cost_per_mtok).toBe(15.0);
      expect(config.cache_read_cost_per_mtok).toBe(0.3);
      expect(config.cost_per_minute).toBe(0.05);
      expect(config.tokens_per_minute).toBe(4000);
    });

    it("should resolve 'opus' profile to Opus 4 pricing", async () => {
      const { resolveCostProfile } = await import("../../src/utils/cost.js");
      const config = resolveCostProfile("opus");

      expect(config.model).toBe("opus");
      expect(config.input_cost_per_mtok).toBe(15.0);
      expect(config.output_cost_per_mtok).toBe(75.0);
    });

    it("should resolve 'haiku' profile to Haiku pricing", async () => {
      const { resolveCostProfile } = await import("../../src/utils/cost.js");
      const config = resolveCostProfile("haiku");

      expect(config.model).toBe("haiku");
      expect(config.input_cost_per_mtok).toBe(0.25);
      expect(config.output_cost_per_mtok).toBe(1.25);
    });

    it("should return default (sonnet) for unknown profile", async () => {
      const { resolveCostProfile } = await import("../../src/utils/cost.js");
      const config = resolveCostProfile("unknown");

      expect(config.model).toBe("sonnet");
      expect(config.input_cost_per_mtok).toBe(3.0);
    });

    it("should return default (sonnet) for 'custom' profile", async () => {
      const { resolveCostProfile } = await import("../../src/utils/cost.js");
      const config = resolveCostProfile("custom");

      expect(config.model).toBe("sonnet");
    });
  });

  describe("getCostPerMinute", () => {
    it("should return default cost_per_minute when no role specified", async () => {
      const { getCostPerMinute } = await import("../../src/utils/cost.js");
      const result = getCostPerMinute(DEFAULT_COST_CONFIG);

      expect(result).toBe(0.05);
    });

    it("should return default cost_per_minute when role has no override", async () => {
      const { getCostPerMinute } = await import("../../src/utils/cost.js");
      const result = getCostPerMinute(DEFAULT_COST_CONFIG, "builder");

      expect(result).toBe(0.05);
    });

    it("should return role-specific override when present", async () => {
      const { getCostPerMinute } = await import("../../src/utils/cost.js");
      const config: CostConfig = {
        ...DEFAULT_COST_CONFIG,
        roles: {
          builder: { cost_per_minute: 0.08 },
          architect: { cost_per_minute: 0.03 },
        },
      };

      expect(getCostPerMinute(config, "builder")).toBe(0.08);
      expect(getCostPerMinute(config, "architect")).toBe(0.03);
      expect(getCostPerMinute(config, "evaluator")).toBe(0.05); // falls back to default
    });
  });

  describe("getTokensPerMinute", () => {
    it("should return default tokens_per_minute when no role specified", async () => {
      const { getTokensPerMinute } = await import("../../src/utils/cost.js");
      const result = getTokensPerMinute(DEFAULT_COST_CONFIG);

      expect(result).toBe(4000);
    });

    it("should return role-specific override when present", async () => {
      const { getTokensPerMinute } = await import("../../src/utils/cost.js");
      const config: CostConfig = {
        ...DEFAULT_COST_CONFIG,
        roles: {
          builder: { tokens_per_minute: 6000 },
        },
      };

      expect(getTokensPerMinute(config, "builder")).toBe(6000);
      expect(getTokensPerMinute(config, "architect")).toBe(4000); // falls back
    });

    it("should return default when role exists but has no tokens_per_minute override", async () => {
      const { getTokensPerMinute } = await import("../../src/utils/cost.js");
      const config: CostConfig = {
        ...DEFAULT_COST_CONFIG,
        roles: {
          builder: { cost_per_minute: 0.08 }, // only cost override, not tokens
        },
      };

      expect(getTokensPerMinute(config, "builder")).toBe(4000);
    });
  });
});
