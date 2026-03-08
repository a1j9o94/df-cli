import { describe, test, expect } from "bun:test";
import { agentListCommand } from "../../../src/commands/agent/list.js";

describe("agent list command - enriched", () => {
  test("has --active option", () => {
    const activeOpt = agentListCommand.options.find(
      (o) => o.long === "--active",
    );
    expect(activeOpt).toBeDefined();
  });

  test("has --module option", () => {
    const moduleOpt = agentListCommand.options.find(
      (o) => o.long === "--module",
    );
    expect(moduleOpt).toBeDefined();
  });

  test("has --run-id option", () => {
    const runIdOpt = agentListCommand.options.find(
      (o) => o.long === "--run-id",
    );
    expect(runIdOpt).toBeDefined();
  });

  test("has --json option", () => {
    const jsonOpt = agentListCommand.options.find(
      (o) => o.long === "--json",
    );
    expect(jsonOpt).toBeDefined();
  });
});
