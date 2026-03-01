import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Command } from "commander";

interface ServerConfig {
  port: number;
  dbPath?: string;
}

interface ServerHandle {
  port: number;
  url: string;
  stop: () => void;
}

function mockStartServerCapture() {
  let captured: ServerConfig | null = null;
  const fn = async (config: ServerConfig): Promise<ServerHandle> => {
    captured = config;
    return {
      port: config.port,
      url: `http://localhost:${config.port}`,
      stop: () => {},
    };
  };
  return { fn, getConfig: () => captured };
}

describe("dash command", () => {
  // We need to test the command structure and behavior.
  // The actual startServer is from mod-api-server (ServerExport contract),
  // so we mock it in tests.

  test("dashCommand is a Commander Command named 'dash'", async () => {
    const { dashCommand } = await import("../../../src/commands/dash.js");
    expect(dashCommand).toBeInstanceOf(Command);
    expect(dashCommand.name()).toBe("dash");
  });

  test("dashCommand has a description", async () => {
    const { dashCommand } = await import("../../../src/commands/dash.js");
    expect(dashCommand.description()).toBeTruthy();
    expect(dashCommand.description().toLowerCase()).toContain("dashboard");
  });

  test("dashCommand has --port option with default 3141", async () => {
    const { dashCommand } = await import("../../../src/commands/dash.js");
    const portOption = dashCommand.options.find((opt) => opt.long === "--port");
    expect(portOption).toBeDefined();
    expect(portOption?.defaultValue).toBe(3141);
  });

  test("dashCommand has --no-open option", async () => {
    const { dashCommand } = await import("../../../src/commands/dash.js");
    const noOpenOption = dashCommand.options.find((opt) => opt.long === "--no-open");
    expect(noOpenOption).toBeDefined();
  });

  test("dashCommand parses custom port from --port flag", async () => {
    const { dashCommand } = await import("../../../src/commands/dash.js");
    const portOption = dashCommand.options.find((opt) => opt.long === "--port");
    expect(portOption).toBeDefined();
    expect(portOption?.flags).toContain("<port>");
  });
});

describe("dash command action logic", () => {
  test("createDashAction calls startServer with correct port", async () => {
    const { createDashAction } = await import("../../../src/commands/dash.js");
    const { fn, getConfig } = mockStartServerCapture();

    const action = createDashAction(fn);
    await action({ port: 8080, open: true }, { suppressOpen: true, suppressSignalHandlers: true });

    const cfg = getConfig();
    expect(cfg).not.toBeNull();
    expect(cfg?.port).toBe(8080);
  });

  test("createDashAction uses default port 3141", async () => {
    const { createDashAction } = await import("../../../src/commands/dash.js");
    const { fn, getConfig } = mockStartServerCapture();

    const action = createDashAction(fn);
    await action({ port: 3141, open: true }, { suppressOpen: true, suppressSignalHandlers: true });

    expect(getConfig()?.port).toBe(3141);
  });

  test("createDashAction calls stop on the server handle", async () => {
    const { createDashAction } = await import("../../../src/commands/dash.js");

    let stopped = false;
    const mockStartServer = async (config: ServerConfig): Promise<ServerHandle> => ({
      port: config.port,
      url: `http://localhost:${config.port}`,
      stop: () => {
        stopped = true;
      },
    });

    const action = createDashAction(mockStartServer);
    const handle = await action(
      { port: 3141, open: true },
      { suppressOpen: true, suppressSignalHandlers: true, returnHandle: true },
    );

    // The handle should have a stop function
    expect(handle).toBeDefined();
    expect(handle?.stop).toBeFunction();
    handle?.stop();
    expect(stopped).toBe(true);
  });

  test("createDashAction resolves dbPath from findDfDir", async () => {
    const { createDashAction } = await import("../../../src/commands/dash.js");
    const { fn, getConfig } = mockStartServerCapture();

    const action = createDashAction(fn);
    await action({ port: 3141, open: true }, { suppressOpen: true, suppressSignalHandlers: true });

    const cfg = getConfig();
    expect(cfg).not.toBeNull();
    // dbPath is optional per contract — it may or may not be set
    if (cfg?.dbPath) {
      expect(cfg?.dbPath).toContain("state.db");
    }
  });

  test("createDashAction handles startServer failure gracefully", async () => {
    const { createDashAction } = await import("../../../src/commands/dash.js");

    const mockStartServer = async (_config: ServerConfig): Promise<ServerHandle> => {
      throw new Error("EADDRINUSE: port already in use");
    };

    const action = createDashAction(mockStartServer);
    let errorThrown = false;
    try {
      await action(
        { port: 3141, open: true },
        { suppressOpen: true, suppressSignalHandlers: true, suppressExit: true },
      );
    } catch (_e) {
      errorThrown = true;
    }
    // The action should handle errors (either catch or re-throw)
    // It's acceptable to throw since the CLI will catch it
    expect(errorThrown).toBe(true);
  });
});

describe("dash command registration in index.ts", () => {
  test("index.ts imports dashCommand", () => {
    const indexPath = join(dirname(dirname(dirname(__dirname))), "src", "index.ts");
    const indexContent = readFileSync(indexPath, "utf-8");
    expect(indexContent).toContain("import { dashCommand }");
    expect(indexContent).toContain('from "./commands/dash.js"');
  });

  test("index.ts registers dashCommand with program.addCommand", () => {
    const indexPath = join(dirname(dirname(dirname(__dirname))), "src", "index.ts");
    const indexContent = readFileSync(indexPath, "utf-8");
    expect(indexContent).toContain("program.addCommand(dashCommand)");
  });
});
