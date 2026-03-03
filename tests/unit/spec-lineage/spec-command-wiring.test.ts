import { describe, test, expect } from "bun:test";
import { specCommand } from "../../../src/commands/spec/index.js";

describe("spec command wiring", () => {
  test("spec command has 'create' subcommand", () => {
    const create = specCommand.commands.find((c) => c.name() === "create");
    expect(create).toBeDefined();
  });

  test("spec command has 'show' subcommand", () => {
    const show = specCommand.commands.find((c) => c.name() === "show");
    expect(show).toBeDefined();
  });

  test("spec command has 'list' subcommand", () => {
    const list = specCommand.commands.find((c) => c.name() === "list");
    expect(list).toBeDefined();
  });

  test("spec command has 'history' subcommand", () => {
    const history = specCommand.commands.find((c) => c.name() === "history");
    expect(history).toBeDefined();
  });

  test("spec command has 'archive' subcommand", () => {
    const archive = specCommand.commands.find((c) => c.name() === "archive");
    expect(archive).toBeDefined();
  });

  test("spec create has --from option", () => {
    const create = specCommand.commands.find((c) => c.name() === "create");
    expect(create).toBeDefined();
    const fromOption = create!.options.find((o) => o.long === "--from");
    expect(fromOption).toBeDefined();
  });

  test("spec history requires spec-id argument", () => {
    const history = specCommand.commands.find((c) => c.name() === "history");
    expect(history).toBeDefined();
    // Commander stores registered arguments in registeredArguments (not args)
    expect((history as any).registeredArguments.length).toBeGreaterThan(0);
  });

  test("spec archive requires spec-id argument", () => {
    const archive = specCommand.commands.find((c) => c.name() === "archive");
    expect(archive).toBeDefined();
    expect((archive as any).registeredArguments.length).toBeGreaterThan(0);
  });
});
