import type { AgentHandle, AgentSpawnConfig } from "../types/index.js";
import { AgentLogWriter } from "./agent-log.js";
import type { AgentRuntime } from "./interface.js";
import { killProcess, spawnProcess } from "./process.js";
import type { ProcessHandle } from "./process.js";

interface InternalHandle extends AgentHandle {
  pid: number;
  proc: ProcessHandle;
  logWriter?: AgentLogWriter;
}

export class ClaudeCodeRuntime implements AgentRuntime {
  private handles = new Map<string, InternalHandle>();
  private binary: string;
  private logsDir?: string;

  constructor(binary = "claude", logsDir?: string) {
    this.binary = binary;
    this.logsDir = logsDir;
  }

  /**
   * Get the configured logs directory, if any.
   */
  getLogsDir(): string | undefined {
    return this.logsDir;
  }

  /**
   * Create an AgentLogWriter for the given agent ID, if logging is enabled.
   */
  getLogWriter(agentId: string): AgentLogWriter | undefined {
    if (!this.logsDir) return undefined;
    return new AgentLogWriter(this.logsDir, agentId);
  }

  /**
   * Build the CLI arguments for spawning a Claude process.
   * Extracted as a public method for testability.
   */
  buildSpawnArgs(config: AgentSpawnConfig): string[] {
    const args = [
      "--print",
      "--dangerously-skip-permissions",
    ];

    // NOTE: --output-format stream-json disabled for now.
    // It was causing agents to exit immediately. Needs investigation.
    // if (this.logsDir) {
    //   args.push("--output-format", "stream-json");
    // }

    args.push("--system-prompt", config.system_prompt, this.buildInitialMessage(config));

    return args;
  }

  /**
   * Build the initial message that tells the agent who it is and how to communicate.
   */
  private buildInitialMessage(config: AgentSpawnConfig): string {
    return [
      `You are agent ${config.agent_id} (role: ${config.role}) in run ${config.run_id}.`,
      `Check your mail for instructions: dark mail check --agent ${config.agent_id}`,
      `When finished, call: dark agent complete ${config.agent_id}`,
      `If you cannot complete your work, call: dark agent fail ${config.agent_id} --error "<description>"`,
    ].join("\n");
  }

  async spawn(config: AgentSpawnConfig): Promise<AgentHandle> {
    const agentId = config.agent_id;
    const args = this.buildSpawnArgs(config);

    // Set up log writer if logging is enabled
    const logWriter = this.getLogWriter(agentId);

    // When logging is enabled, pipe stdout so we can capture stream-json output.
    // Otherwise, ignore stdout as before.
    const stdoutMode = logWriter ? ("pipe" as const) : ("ignore" as const);

    // If no worktree_path, use a temp directory as cwd to avoid loading
    // project-level .claude/CLAUDE.md (which can be 50KB+ and exhaust context)
    let cwd = config.worktree_path;
    if (!cwd) {
      const { mkdtempSync } = await import("node:fs");
      const { tmpdir } = await import("node:os");
      const { join } = await import("node:path");
      cwd = mkdtempSync(join(tmpdir(), "df-agent-cwd-"));
    }

    const proc = spawnProcess(this.binary, args, {
      cwd,
      env: {
        CLAUDECODE: "",
        DF_AGENT_ID: agentId,
        DF_RUN_ID: config.run_id,
        DF_ROLE: config.role,
      },
      stdout: stdoutMode,
      stderr: "pipe",
    });

    // If logging, pipe stdout lines to the log writer
    const stdout = proc.process.stdout;
    if (logWriter && stdout && typeof stdout !== "number") {
      this.pipeStdoutToLog(stdout, logWriter);
    }

    // Always capture stderr for crash diagnostics
    const stderr = proc.process.stderr;
    if (stderr && typeof stderr !== "number") {
      this.captureStderr(stderr, agentId);
    }

    const handle: InternalHandle = {
      id: agentId,
      pid: proc.pid,
      role: config.role,
      proc,
      logWriter,
      kill: async () => {
        killProcess(proc.pid);
        logWriter?.close();
        this.handles.delete(agentId);
      },
    };

    this.handles.set(agentId, handle);
    return handle;
  }

  /**
   * Read lines from a readable stream and write them to the log file.
   * Each line from stream-json is a complete JSON object.
   */
  private async pipeStdoutToLog(
    stdout: ReadableStream<Uint8Array>,
    writer: AgentLogWriter,
  ): Promise<void> {
    const reader = stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.trim()) {
            writer.writeLine(line);
          }
        }
      }

      // Flush any remaining content
      if (buffer.trim()) {
        writer.writeLine(buffer);
      }
    } catch {
      // Process may have been killed — that's fine, we still have what we captured
    } finally {
      writer.close();
    }
  }

  /**
   * Capture stderr from an agent process and log it when the process exits.
   * This is how we diagnose why agents crash.
   */
  private async captureStderr(
    stderr: ReadableStream<Uint8Array>,
    agentId: string,
  ): Promise<void> {
    const reader = stderr.getReader();
    const decoder = new TextDecoder();
    let output = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
      }
    } catch {
      // Process killed — fine
    }

    if (output.trim()) {
      console.error(`[dark] Agent ${agentId} stderr:\n${output.trim()}`);
    }
  }

  async send(_agentId: string, _message: string): Promise<void> {
    // Messages are sent via the DB mail system, not directly to the process.
    // The agent polls `df mail check` to retrieve messages.
    // This method is a no-op for the CLI-based runtime.
  }

  async kill(agentId: string): Promise<void> {
    const handle = this.handles.get(agentId);
    if (handle) {
      await handle.kill();
    }
  }

  async status(agentId: string): Promise<"running" | "stopped" | "unknown"> {
    const handle = this.handles.get(agentId);
    if (!handle) return "unknown";
    // Use the Subprocess exit code — immune to PID recycling
    return handle.proc.process.exitCode === null ? "running" : "stopped";
  }

  async listActive(): Promise<AgentHandle[]> {
    const active: AgentHandle[] = [];
    for (const [id, handle] of this.handles) {
      if (handle.proc.process.exitCode === null) {
        active.push(handle);
      } else {
        this.handles.delete(id);
      }
    }
    return active;
  }
}
