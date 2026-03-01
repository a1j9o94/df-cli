import type { AgentHandle, AgentSpawnConfig } from "../types/index.js";
import type { AgentRuntime } from "./interface.js";
import { spawnProcess, killProcess } from "./process.js";
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

  async spawn(config: AgentSpawnConfig): Promise<AgentHandle> {
    const agentId = config.agent_id;

    const initialMessage = [
      `You are agent ${agentId} (role: ${config.role}) in run ${config.run_id}.`,
      `Check your mail for instructions: dark mail check --agent ${agentId}`,
      `When finished, call: dark agent complete ${agentId}`,
      `If you cannot complete your work, call: dark agent fail ${agentId} --error "<description>"`,
    ].join("\n");

    const proc = spawnProcess(
      this.binary,
      [
        "--print",
        "--dangerously-skip-permissions",
        "--system-prompt", config.system_prompt,
        initialMessage,
      ],
      {
        cwd: config.worktree_path,
        env: {
          CLAUDECODE: "",
          DF_AGENT_ID: agentId,
          DF_RUN_ID: config.run_id,
          DF_ROLE: config.role,
        },
        stdout: "ignore",
        stderr: "ignore",
      },
    );

    const handle: InternalHandle = {
      id: agentId,
      pid: proc.pid,
      role: config.role,
      proc,
      kill: async () => {
        killProcess(proc.pid);
        this.handles.delete(agentId);
      },
    };

    this.handles.set(agentId, handle);
    return handle;
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
