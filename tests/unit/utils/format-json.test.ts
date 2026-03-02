import { describe, expect, test } from "bun:test";
import { formatJson } from "../../../src/utils/format.js";

describe("formatJson", () => {
  test("produces valid JSON for simple objects", () => {
    const data = { name: "test", value: 42 };
    const result = formatJson(data);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual(data);
  });

  test("produces valid JSON when data contains newlines", () => {
    const data = { content: "line1\nline2\nline3" };
    const result = formatJson(data);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result).content).toBe("line1\nline2\nline3");
  });

  test("produces valid JSON when data contains tabs", () => {
    const data = { content: "col1\tcol2\tcol3" };
    const result = formatJson(data);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result).content).toBe("col1\tcol2\tcol3");
  });

  test("produces valid JSON when data contains all control characters", () => {
    // Build a string with every control char 0x00-0x1F
    let controlStr = "";
    for (let i = 0; i < 32; i++) {
      controlStr += String.fromCharCode(i);
    }
    const data = { prompt: controlStr };
    const result = formatJson(data);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  test("produces valid JSON when data contains template literal multiline strings", () => {
    const data = {
      system_prompt: `You are an agent.

Follow these steps:
\t1. Read the spec
\t2. Write code
\t3. Test it

Done.`,
    };
    const result = formatJson(data);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  test("excludes specified fields when excludeFields option is provided", () => {
    const data = {
      id: "agent_1",
      name: "builder",
      system_prompt: "You are a builder agent...",
    };
    const result = formatJson(data, { excludeFields: ["system_prompt"] });
    const parsed = JSON.parse(result);
    expect(parsed.id).toBe("agent_1");
    expect(parsed.name).toBe("builder");
    expect(parsed).not.toHaveProperty("system_prompt");
  });

  test("excludes fields from nested arrays of objects", () => {
    const data = [
      { id: "1", system_prompt: "prompt1", name: "a" },
      { id: "2", system_prompt: "prompt2", name: "b" },
    ];
    const result = formatJson(data, { excludeFields: ["system_prompt"] });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).not.toHaveProperty("system_prompt");
    expect(parsed[1]).not.toHaveProperty("system_prompt");
    expect(parsed[0].id).toBe("1");
    expect(parsed[1].name).toBe("b");
  });

  test("returns all fields when excludeFields is empty or not provided", () => {
    const data = { id: "1", system_prompt: "prompt", name: "test" };
    const result1 = formatJson(data);
    const result2 = formatJson(data, { excludeFields: [] });
    expect(JSON.parse(result1)).toHaveProperty("system_prompt");
    expect(JSON.parse(result2)).toHaveProperty("system_prompt");
  });

  test("handles deeply nested objects with control characters", () => {
    const data = {
      agent: {
        config: {
          prompt: "Hello\x00World\x01Test\x1F",
        },
      },
    };
    const result = formatJson(data);
    expect(() => JSON.parse(result)).not.toThrow();
  });
});
