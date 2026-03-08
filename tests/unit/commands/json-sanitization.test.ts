import { describe, expect, test } from "bun:test";
import { formatJson } from "../../../src/utils/format.js";

describe("formatJson sanitizes control characters", () => {
  test("null bytes are removed from string values", () => {
    const data = { name: "test\x00name", value: "hello\x00world" };
    const json = formatJson(data);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    // Null bytes should be stripped or escaped safely
    expect(parsed.name).not.toContain("\x00");
    expect(parsed.value).not.toContain("\x00");
  });

  test("all control characters 0x00-0x1F are sanitized in output", () => {
    let controlStr = "";
    for (let i = 0; i < 32; i++) {
      controlStr += String.fromCharCode(i);
    }
    controlStr += "normal text";

    const data = { field: controlStr };
    const json = formatJson(data);
    expect(() => JSON.parse(json)).not.toThrow();
    // Should be parseable by any JSON parser - no raw control chars
    const parsed = JSON.parse(json);
    expect(parsed.field).toContain("normal text");
  });

  test("sanitization works on nested objects", () => {
    const data = {
      outer: {
        inner: "has\x00null",
        deep: { value: "also\x00null\x01here" },
      },
    };
    const json = formatJson(data);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed.outer.inner).not.toContain("\x00");
    expect(parsed.outer.deep.value).not.toContain("\x00");
    expect(parsed.outer.deep.value).not.toContain("\x01");
  });

  test("sanitization works on arrays of objects", () => {
    const data = [
      { name: "agent\x00one" },
      { name: "agent\x00two" },
    ];
    const json = formatJson(data);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed[0].name).not.toContain("\x00");
    expect(parsed[1].name).not.toContain("\x00");
  });

  test("sanitization preserves normal strings unchanged", () => {
    const data = { name: "normal string", count: 42, active: true };
    const json = formatJson(data);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("normal string");
    expect(parsed.count).toBe(42);
    expect(parsed.active).toBe(true);
  });

  test("sanitization combined with excludeFields", () => {
    const data = {
      name: "test\x00agent",
      system_prompt: "prompt\x00with\x00nulls",
    };
    const json = formatJson(data, { excludeFields: ["system_prompt"] });
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed).not.toHaveProperty("system_prompt");
    expect(parsed.name).not.toContain("\x00");
  });

  test("null bytes in non-excluded fields are sanitized", () => {
    // This is the key scenario from the spec: even fields that aren't excluded
    // but contain null bytes from SQLite TEXT columns should be sanitized
    const data = {
      name: "builder\x00-1",
      error: "Error:\x00something\x1Ffailed",
      role: "builder",
    };
    const json = formatJson(data);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    // Null bytes and control chars should be gone
    expect(json).not.toContain("\x00");
    expect(parsed.role).toBe("builder");
  });
});
