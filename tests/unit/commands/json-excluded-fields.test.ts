import { describe, expect, test } from "bun:test";
import { AGENT_DEFAULT_EXCLUDED_FIELDS } from "../../../src/utils/format.js";

describe("centralized excluded fields", () => {
  test("AGENT_DEFAULT_EXCLUDED_FIELDS is exported and contains system_prompt", () => {
    expect(AGENT_DEFAULT_EXCLUDED_FIELDS).toBeDefined();
    expect(AGENT_DEFAULT_EXCLUDED_FIELDS).toContain("system_prompt");
  });

  test("AGENT_DEFAULT_EXCLUDED_FIELDS is a readonly array", () => {
    expect(Array.isArray(AGENT_DEFAULT_EXCLUDED_FIELDS)).toBe(true);
    // Should be usable directly with formatJson excludeFields option
    expect(AGENT_DEFAULT_EXCLUDED_FIELDS.length).toBeGreaterThan(0);
  });
});
