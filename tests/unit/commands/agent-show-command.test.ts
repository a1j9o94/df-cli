import { describe, test, expect } from "bun:test";

describe("agent show command exists", () => {
  test("agentShowCommand is importable and is a Commander command", async () => {
    const { agentShowCommand } = await import("../../../src/commands/agent/show.js");
    expect(agentShowCommand).toBeDefined();
    expect(agentShowCommand.name()).toBe("show");
  });

  test("agentShowCommand accepts an agent-id argument", async () => {
    const { agentShowCommand } = await import("../../../src/commands/agent/show.js");
    // Commander stores arguments
    const args = agentShowCommand.registeredArguments ?? [];
    expect(args.length).toBeGreaterThanOrEqual(1);
  });

  test("agentShowCommand has --json option", async () => {
    const { agentShowCommand } = await import("../../../src/commands/agent/show.js");
    const opts = agentShowCommand.options.map((o: any) => o.long);
    expect(opts).toContain("--json");
  });
});

describe("agent list command has enriched options", () => {
  test("agentListCommand has --active option", async () => {
    const { agentListCommand } = await import("../../../src/commands/agent/list.js");
    const opts = agentListCommand.options.map((o: any) => o.long);
    expect(opts).toContain("--active");
  });

  test("agentListCommand has --module option", async () => {
    const { agentListCommand } = await import("../../../src/commands/agent/list.js");
    const opts = agentListCommand.options.map((o: any) => o.long);
    expect(opts).toContain("--module");
  });
});

describe("agent command registers show subcommand", () => {
  test("agentCommand includes show subcommand", async () => {
    const { agentCommand } = await import("../../../src/commands/agent/index.js");
    const subcommands = agentCommand.commands.map((c: any) => c.name());
    expect(subcommands).toContain("show");
  });
});
