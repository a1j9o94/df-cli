import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function createTempDfDir(configYaml: string): string {
  const base = mkdtempSync(join(tmpdir(), "df-cost-test-"));
  const dfDir = join(base, ".df");
  mkdirSync(dfDir, { recursive: true });
  writeFileSync(join(dfDir, "config.yaml"), configYaml);
  return dfDir;
}

describe("Config loading with cost section", () => {
  it("should provide default cost config when no cost section in YAML", () => {
    const { getConfig } = require("../../src/utils/config.js");
    const dfDir = createTempDfDir(`
project:
  name: test
  root: .
  branch: main
`);

    const config = getConfig(dfDir);
    expect(config.cost).toBeDefined();
    expect(config.cost.model).toBe("sonnet");
    expect(config.cost.cost_per_minute).toBe(0.05);
    expect(config.cost.tokens_per_minute).toBe(4000);
    expect(config.cost.input_cost_per_mtok).toBe(3.0);
    expect(config.cost.output_cost_per_mtok).toBe(15.0);
  });

  it("should resolve profile shorthand from YAML cost section", () => {
    const { getConfig } = require("../../src/utils/config.js");
    const dfDir = createTempDfDir(`
project:
  name: test
  root: .
  branch: main
cost:
  profile: opus
`);

    const config = getConfig(dfDir);
    expect(config.cost.model).toBe("opus");
    expect(config.cost.input_cost_per_mtok).toBe(15.0);
    expect(config.cost.output_cost_per_mtok).toBe(75.0);
    expect(config.cost.cost_per_minute).toBe(0.20);
  });

  it("should allow custom cost_per_minute in YAML", () => {
    const { getConfig } = require("../../src/utils/config.js");
    const dfDir = createTempDfDir(`
project:
  name: test
  root: .
  branch: main
cost:
  cost_per_minute: 0.15
`);

    const config = getConfig(dfDir);
    expect(config.cost.cost_per_minute).toBe(0.15);
    // Other fields default to sonnet
    expect(config.cost.model).toBe("sonnet");
    expect(config.cost.input_cost_per_mtok).toBe(3.0);
  });

  it("should allow profile + explicit override in YAML", () => {
    const { getConfig } = require("../../src/utils/config.js");
    const dfDir = createTempDfDir(`
project:
  name: test
  root: .
  branch: main
cost:
  profile: opus
  cost_per_minute: 0.30
`);

    const config = getConfig(dfDir);
    expect(config.cost.model).toBe("opus");
    expect(config.cost.input_cost_per_mtok).toBe(15.0); // from opus profile
    expect(config.cost.cost_per_minute).toBe(0.30); // explicit override
  });

  it("should load role-specific overrides from YAML", () => {
    const { getConfig } = require("../../src/utils/config.js");
    const dfDir = createTempDfDir(`
project:
  name: test
  root: .
  branch: main
cost:
  roles:
    builder:
      cost_per_minute: 0.08
    architect:
      cost_per_minute: 0.03
`);

    const config = getConfig(dfDir);
    expect(config.cost.roles).toBeDefined();
    expect(config.cost.roles.builder.cost_per_minute).toBe(0.08);
    expect(config.cost.roles.architect.cost_per_minute).toBe(0.03);
  });

  it("should preserve existing non-cost config fields", () => {
    const { getConfig } = require("../../src/utils/config.js");
    const dfDir = createTempDfDir(`
project:
  name: my-project
  root: .
  branch: develop
build:
  budget_usd: 100
cost:
  profile: haiku
`);

    const config = getConfig(dfDir);
    // Cost section resolved
    expect(config.cost.model).toBe("haiku");
    // Non-cost fields preserved
    expect(config.project.name).toBe("my-project");
    expect(config.project.branch).toBe("develop");
    expect(config.build.budget_usd).toBe(100);
  });
});
