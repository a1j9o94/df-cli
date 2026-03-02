import { describe, expect, test, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, listAgents } from "../../../src/db/queries/agents.js";
import { formatJson } from "../../../src/utils/format.js";
import type { SqliteDb } from "../../../src/db/index.js";

/**
 * Integration tests verifying that JSON output from agent data
 * is valid and system_prompt is properly handled.
 */

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_test" }).id;
});

describe("JSON sanitization for agent list", () => {
  test("agent list JSON is valid when system_prompt contains newlines and tabs", () => {
    const multilinePrompt = `You are a builder agent.

Follow these steps:
\t1. Read the spec
\t2. Write tests
\t3. Implement code

Rules:
- No hardcoding
- Follow TDD`;

    createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-1",
      system_prompt: multilinePrompt,
    });

    const agents = listAgents(db, runId);
    const json = formatJson(agents);

    // Must be valid JSON
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].system_prompt).toBe(multilinePrompt);
  });

  test("agent list JSON is valid when system_prompt contains control characters", () => {
    // Build a string with various control characters
    const nastyPrompt = "Hello\x00World\x01Test\x02Prompt\x1FEnd";

    createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-ctrl",
      system_prompt: nastyPrompt,
    });

    const agents = listAgents(db, runId);
    const json = formatJson(agents);

    // Must be valid JSON
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test("system_prompt is excluded from JSON when excludeFields is used", () => {
    createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-1",
      system_prompt: "Very long system prompt that should be excluded...",
    });

    const agents = listAgents(db, runId);

    // Default: includes system_prompt
    const jsonWithPrompt = formatJson(agents);
    const withPrompt = JSON.parse(jsonWithPrompt);
    expect(withPrompt[0]).toHaveProperty("system_prompt");

    // With excludeFields: system_prompt removed
    const jsonWithout = formatJson(agents, { excludeFields: ["system_prompt"] });
    const withoutPrompt = JSON.parse(jsonWithout);
    expect(withoutPrompt[0]).not.toHaveProperty("system_prompt");
    expect(withoutPrompt[0].name).toBe("builder-1");
    expect(withoutPrompt[0].role).toBe("builder");
  });

  test("verbose mode includes system_prompt in valid JSON", () => {
    const bigPrompt = "A".repeat(10000) + "\n" + "B".repeat(10000);

    createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "architect",
      name: "architect-1",
      system_prompt: bigPrompt,
    });

    const agents = listAgents(db, runId);

    // Verbose mode: include everything
    const verboseJson = formatJson(agents);
    expect(() => JSON.parse(verboseJson)).not.toThrow();
    const parsed = JSON.parse(verboseJson);
    expect(parsed[0].system_prompt).toBe(bigPrompt);
  });

  test("multiple agents with mixed prompts all produce valid JSON", () => {
    const prompts = [
      "Simple prompt",
      "Prompt with\nnewlines\nand\ttabs",
      `Template literal
with multiple
lines`,
      "Prompt with special chars: \"quotes\" and \\backslashes\\",
      null, // some agents may have null system_prompt
    ];

    for (let i = 0; i < prompts.length; i++) {
      createAgent(db, {
        agent_id: "",
        run_id: runId,
        role: "builder",
        name: `builder-${i}`,
        system_prompt: prompts[i] ?? "",
      });
    }

    const agents = listAgents(db, runId);
    const json = formatJson(agents);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(5);
  });

  test("status command JSON with agents containing system_prompt is valid", () => {
    createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-1",
      system_prompt: "Multi\nline\tprompt\x00with\x01control\x1Fchars",
    });

    const agents = listAgents(db, runId);
    // Simulate what status --json does (includes agents in output)
    const statusData = {
      run: { id: runId, status: "running", spec_id: "spec_test" },
      agents: agents,
    };

    // Without exclusion
    const json = formatJson(statusData);
    expect(() => JSON.parse(json)).not.toThrow();

    // With exclusion (nested objects in arrays within objects)
    const jsonExcluded = formatJson(statusData, { excludeFields: ["system_prompt"] });
    expect(() => JSON.parse(jsonExcluded)).not.toThrow();
    const parsed = JSON.parse(jsonExcluded);
    // system_prompt should be excluded from the agents array items
    expect(parsed.agents[0]).not.toHaveProperty("system_prompt");
    // But the run data should be intact
    expect(parsed.run.id).toBe(runId);
  });
});
