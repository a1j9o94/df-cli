import { join } from "node:path";
import { Command } from "commander";
import { findDfDir } from "../utils/config.js";
import { log } from "../utils/logger.js";

// ── Contract: ServerExport ──────────────────────────────────────────
// interface ServerConfig { port: number; dbPath?: string; }
// interface ServerHandle { port: number; url: string; stop: () => void; }
// export function startServer(config: ServerConfig): Promise<ServerHandle>;
// ─────────────────────────────────────────────────────────────────────

interface ServerConfig {
  port: number;
  dbPath?: string;
}

interface ServerHandle {
  port: number;
  url: string;
  stop: () => void;
}

type StartServerFn = (config: ServerConfig) => Promise<ServerHandle>;

interface DashOptions {
  port: number;
  open: boolean;
}

interface ActionOptions {
  /** Skip opening the browser (for tests) */
  suppressOpen?: boolean;
  /** Skip registering SIGINT/SIGTERM handlers (for tests) */
  suppressSignalHandlers?: boolean;
  /** Return the server handle instead of waiting (for tests) */
  returnHandle?: boolean;
  /** Skip process.exit on error (for tests) */
  suppressExit?: boolean;
}

/**
 * Creates the dash action handler with an injectable startServer function.
 * This allows tests to provide a mock server without importing the real server module.
 */
export function createDashAction(startServer: StartServerFn) {
  return async (
    options: DashOptions,
    actionOptions?: ActionOptions,
  ): Promise<ServerHandle | undefined> => {
    const { port, open: shouldOpen } = options;
    const {
      suppressOpen = false,
      suppressSignalHandlers = false,
      returnHandle = false,
      suppressExit = false,
    } = actionOptions ?? {};

    // Resolve .df directory for database path
    const dfDir = findDfDir();
    const dbPath = dfDir ? join(dfDir, "state.db") : undefined;

    let handle: ServerHandle;
    try {
      handle = await startServer({ port, dbPath });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error(`Failed to start dashboard server: ${message}`);
      if (!suppressExit) {
        process.exit(1);
      }
      throw err;
    }

    log.success(`Dashboard running at ${handle.url}`);
    log.info("Press Ctrl+C to stop");

    // Open browser unless --no-open was passed
    if (shouldOpen && !suppressOpen) {
      openBrowser(handle.url);
    }

    // Register graceful shutdown handlers
    if (!suppressSignalHandlers) {
      const shutdown = () => {
        log.info("\nShutting down dashboard...");
        handle.stop();
        process.exit(0);
      };

      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    }

    // In test mode, return the handle for inspection
    if (returnHandle) {
      return handle;
    }

    // In normal mode, keep the process alive
    // The server is already listening; Node/Bun will stay alive
    // until the event loop is empty or a signal is received
    return undefined;
  };
}

/**
 * Open a URL in the user's default browser.
 * Best-effort — silently fails if the open command is not available.
 */
function openBrowser(url: string): void {
  try {
    const { platform } = process;
    let cmd: string;
    let args: string[];

    if (platform === "darwin") {
      cmd = "open";
      args = [url];
    } else if (platform === "win32") {
      cmd = "cmd";
      args = ["/c", "start", url];
    } else {
      cmd = "xdg-open";
      args = [url];
    }

    Bun.spawn([cmd, ...args], {
      stdout: "ignore",
      stderr: "ignore",
    });
  } catch {
    // Silently fail — opening the browser is best-effort
  }
}

/**
 * The default startServer implementation.
 * This lazily imports the server module (produced by mod-api-server)
 * to avoid hard compile-time dependency. If the server module is not
 * yet available (during isolated builds), it provides a helpful error.
 */
async function getDefaultStartServer(): Promise<StartServerFn> {
  try {
    // Dynamic import of the server module (produced by mod-api-server).
    // Uses a variable to prevent TypeScript from resolving it at compile time.
    const serverPath = "../dashboard/server.js";
    const serverModule = await import(/* @vite-ignore */ serverPath);
    return serverModule.startServer;
  } catch {
    return async (_config: ServerConfig) => {
      throw new Error(
        "Dashboard server module not found. " +
          "Ensure mod-api-server has been built and integrated. " +
          "The server module should export startServer from src/dashboard/server.ts",
      );
    };
  }
}

// ── Commander command definition ────────────────────────────────────

function parsePort(value: string): number {
  const port = Number.parseInt(value, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${value}. Must be 1-65535.`);
  }
  return port;
}

export const dashCommand = new Command("dash")
  .description("Open the Dark Factory dashboard in your browser")
  .option("--port <port>", "Port to run the dashboard server on", parsePort, 3141)
  .option("--no-open", "Don't automatically open the browser")
  .action(async (options: { port: number; open: boolean }) => {
    const startServer = await getDefaultStartServer();
    const action = createDashAction(startServer);
    await action({ port: options.port, open: options.open });
  });
