import { describe, test, expect } from "bun:test";
import { researchCommand } from "../../../src/commands/research/index.js";
import { researchAddCommand } from "../../../src/commands/research/add.js";
import { researchListCommand } from "../../../src/commands/research/list.js";
import { researchShowCommand } from "../../../src/commands/research/show.js";

describe("research CLI command structure", () => {
  test("research command is defined", () => {
    expect(researchCommand).toBeDefined();
    expect(researchCommand.name()).toBe("research");
  });

  test("research command has add subcommand", () => {
    expect(researchAddCommand).toBeDefined();
    expect(researchAddCommand.name()).toBe("add");
  });

  test("research command has list subcommand", () => {
    expect(researchListCommand).toBeDefined();
    expect(researchListCommand.name()).toBe("list");
  });

  test("research command has show subcommand", () => {
    expect(researchShowCommand).toBeDefined();
    expect(researchShowCommand.name()).toBe("show");
  });

  test("add command accepts agent-id argument", () => {
    const args = researchAddCommand.registeredArguments;
    expect(args.length).toBeGreaterThanOrEqual(1);
    expect(args[0].name()).toBe("agent-id");
  });

  test("add command has --label option", () => {
    const opt = researchAddCommand.options.find((o: any) => o.long === "--label");
    expect(opt).toBeDefined();
  });

  test("add command has --content option", () => {
    const opt = researchAddCommand.options.find((o: any) => o.long === "--content");
    expect(opt).toBeDefined();
  });

  test("add command has --file option", () => {
    const opt = researchAddCommand.options.find((o: any) => o.long === "--file");
    expect(opt).toBeDefined();
  });

  test("add command has --module option", () => {
    const opt = researchAddCommand.options.find((o: any) => o.long === "--module");
    expect(opt).toBeDefined();
  });

  test("list command has --run-id option", () => {
    const opt = researchListCommand.options.find((o: any) => o.long === "--run-id");
    expect(opt).toBeDefined();
  });

  test("list command has --module option", () => {
    const opt = researchListCommand.options.find((o: any) => o.long === "--module");
    expect(opt).toBeDefined();
  });

  test("list command has --json option", () => {
    const opt = researchListCommand.options.find((o: any) => o.long === "--json");
    expect(opt).toBeDefined();
  });

  test("show command accepts research-id argument", () => {
    const args = researchShowCommand.registeredArguments;
    expect(args.length).toBeGreaterThanOrEqual(1);
    expect(args[0].name()).toBe("research-id");
  });

  test("show command has --json option", () => {
    const opt = researchShowCommand.options.find((o: any) => o.long === "--json");
    expect(opt).toBeDefined();
  });
});
