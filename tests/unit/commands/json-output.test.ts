import { describe, expect, test, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, listAgents } from "../../../src/db/queries/agents.js";
import { formatJson } from "../../../src/utils/format.js";
import type { SqliteDb } from "../../../src/db/index.js";

/**
 * Tests that verify the JSON output behavior of commands that include
 * agent data, matching the logic in the actual command handlers.
 */

let db: SqliteDb;
let runId: string;

/** Fields excluded from --json output by default (mirrors agent/list.ts) */
const AGENT_EXCLUDED_FIELDS = ["system_prompt"];

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_test" }).id;
});

describe("agent list --json output", () => {
  test("default output excludes system_prompt and is valid JSON", () => {
    const prompt = `You are a builder agent.

## Instructions
Follow these steps:
\t1. Read the spec
\t2. Write code

Special chars: \x00\x01\x1F`;

    createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-1",
      system_prompt: prompt,
    });

    const agents = listAgents(db, runId);

    // Simulate agent list --json (no --verbose)
    const json = formatJson(agents, { excludeFields: AGENT_EXCLUDED_FIELDS });
    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).not.toHaveProperty("system_prompt");
    expect(parsed[0].name).toBe("builder-1");
    expect(parsed[0].role).toBe("builder");
  });

  test("--verbose output includes system_prompt and is valid JSON", () => {
    const prompt = "A builder prompt with\nnewlines\tand\ttabs";
    createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-1",
      system_prompt: prompt,
    });

    const agents = listAgents(db, runId);

    // Simulate agent list --json --verbose
    const json = formatJson(agents, { excludeFields: [] });
    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed[0]).toHaveProperty("system_prompt");
    expect(parsed[0].system_prompt).toBe(prompt);
  });

  test("output is valid JSON even with extreme control characters", () => {
    // Build a string with ALL 32 control characters
    let extremePrompt = "";
    for (let i = 0; i < 32; i++) {
      extremePrompt += String.fromCharCode(i);
    }
    extremePrompt += "normal text after control chars";

    createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "architect",
      name: "arch-1",
      system_prompt: extremePrompt,
    });

    const agents = listAgents(db, runId);

    // Even with verbose (system_prompt included), JSON must be valid
    const json = formatJson(agents);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe("status --json output", () => {
  test("status with agents excludes system_prompt from agent records", () => {
    createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-1",
      system_prompt: "Long\nmultiline\n\tprompt\nwith\ncontrol\x00chars",
    });

    createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "architect",
      name: "architect-1",
      system_prompt: "Another\nprompt",
    });

    const agents = listAgents(db, runId);
    const statusData = {
      run: { id: runId, status: "running", spec_id: "spec_test" },
      agents,
      mergeQueue: null,
    };

    // Simulate status --json (no --verbose)
    const json = formatJson(statusData, { excludeFields: AGENT_EXCLUDED_FIELDS });
    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.run).toBeDefined();
    expect(parsed.agents).toHaveLength(2);
    expect(parsed.agents[0]).not.toHaveProperty("system_prompt");
    expect(parsed.agents[1]).not.toHaveProperty("system_prompt");
    // Other agent fields should be present
    expect(parsed.agents[0].name).toBeDefined();
    expect(parsed.agents[1].role).toBeDefined();
  });

  test("status --json --verbose includes system_prompt", () => {
    const prompt = "verbose prompt text";
    createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-1",
      system_prompt: prompt,
    });

    const agents = listAgents(db, runId);
    const statusData = { run: { id: runId }, agents };

    // Simulate status --json --verbose
    const json = formatJson(statusData, { excludeFields: [] });
    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.agents[0]).toHaveProperty("system_prompt");
    expect(parsed.agents[0].system_prompt).toBe(prompt);
  });
});

describe("scenario list --json output", () => {
  test("scenario data produces valid JSON via formatJson", () => {
    const scenarios = [
      { name: "test-scenario", type: "functional", path: "/path/to/scenario.md" },
      { name: "change-test", type: "change", path: "/path/to/change.md" },
    ];

    const json = formatJson(scenarios);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("test-scenario");
  });
});

describe("all --json commands produce parseable output", () => {
  test("formatJson always produces valid JSON regardless of input", () => {
    const testCases = [
      // Empty array
      [],
      // Empty object
      {},
      // Null values
      { field: null },
      // Nested nulls
      { agents: [{ system_prompt: null, name: "test" }] },
      // Unicode
      { name: "テスト", description: "日本語のテスト" },
      // Very long strings
      { data: "x".repeat(100000) },
      // Numbers and booleans
      { count: 42, active: true, rate: 3.14 },
    ];

    for (const data of testCases) {
      const json = formatJson(data);
      expect(() => JSON.parse(json)).not.toThrow();
    }
  });
});
