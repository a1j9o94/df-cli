import type { AgentHandle, AgentSpawnConfig, ClaudeResult } from "../types/index.js";
import type { AgentRuntime } from "./interface.js";
import { killProcess, spawnProcess } from "./process.js";
import type { ProcessHandle } from "./process.js";

interface InternalHandle extends AgentHandle {
  pid: number;
  proc: ProcessHandle;
}

export class ClaudeCodeRuntime implements AgentRuntime {
  private handles = new Map<string, InternalHandle>();
  private binary: string;

  constructor(binary = "claude") {
    this.binary = binary;
  }

  /**
   * Build the CLI arguments for spawning a Claude process.
   */
  buildSpawnArgs(config: AgentSpawnConfig): string[] {
    const args = [
      "--print",
      "--dangerously-skip-permissions",
      "--output-format", "json",
    ];

    if (config.resume_session_id) {
      // Resume a previous session — agent picks up with full context
      args.push("--resume", config.resume_session_id);
      args.push(
        `You are agent ${config.agent_id}. Your previous session ended before you called dark agent complete. ` +
        `Check if your work is done. If yes, call: dark agent complete ${config.agent_id}. ` +
        `If not, continue working, then call complete when finished.`
      );
    } else {
      // New session
      args.push("--system-prompt", config.system_prompt);
      args.push(this.buildInitialMessage(config));
    }

    return args;
  }

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
      stdout: "pipe",
      stderr: "pipe",
    });

    // Capture stderr for diagnostics
    const stderrPromise = this.captureStream(proc.process.stderr);

    // Capture stdout — with --output-format json, the entire output is one JSON blob
    const stdoutPromise = this.captureStream(proc.process.stdout);

    // Build a promise that resolves when the process exits with the parsed result
    const resultPromise = (async (): Promise<ClaudeResult | null> => {
      const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);

      if (stderr.trim()) {
        console.error(`[dark] Agent ${agentId} stderr:\n${stderr.trim()}`);
      }

      if (!stdout.trim()) return null;

      try {
        const parsed = JSON.parse(stdout);
        return {
          subtype: parsed.subtype ?? "success",
          session_id: parsed.session_id ?? "",
          is_error: parsed.is_error ?? false,
          num_turns: parsed.num_turns ?? 0,
          total_cost_usd: parsed.total_cost_usd ?? 0,
          duration_ms: parsed.duration_ms ?? 0,
          result: parsed.result,
        };
      } catch {
        // Not valid JSON — might be plain text output
        return null;
      }
    })();

    const handle: InternalHandle = {
      id: agentId,
      pid: proc.pid,
      role: config.role,
      proc,
      result: resultPromise,
      kill: async () => {
        killProcess(proc.pid);
        this.handles.delete(agentId);
      },
    };

    this.handles.set(agentId, handle);
    return handle;
  }

  /**
   * Read an entire stream to a string.
   */
  private async captureStream(
    stream: ReadableStream<Uint8Array> | null | number | undefined,
  ): Promise<string> {
    if (!stream || typeof stream === "number") return "";

    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let output = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
      }
    } catch {
      // Process killed — return what we have
    }

    return output;
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
