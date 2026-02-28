import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AgentHandle, AgentSpawnConfig } from "../types/index.js";
import type { AgentRuntime } from "./interface.js";
import { spawnProcess, isAlive, killProcess } from "./process.js";
import { newAgentId } from "../utils/id.js";

export class ClaudeCodeRuntime implements AgentRuntime {
  private handles = new Map<string, AgentHandle & { pid: number; promptFile?: string }>();
  private binary: string;

  constructor(binary = "claude") {
    this.binary = binary;
  }

  async spawn(config: AgentSpawnConfig): Promise<AgentHandle> {
    const agentId = newAgentId();

    // Write system prompt to a temp file
    const tmpDir = mkdtempSync(join(tmpdir(), "df-agent-"));
    const promptFile = join(tmpDir, "system-prompt.md");
    writeFileSync(promptFile, config.system_prompt);

    const proc = spawnProcess(
      this.binary,
      [
        "--print",
        "--system-prompt", promptFile,
        "--allowedTools", "Edit,Write,Read,Bash,Glob,Grep",
        "--max-turns", "100",
        "Begin your work. Check df mail for instructions.",
      ],
      {
        cwd: config.worktree_path,
        env: {
          DF_AGENT_ID: agentId,
          DF_RUN_ID: config.run_id,
          DF_ROLE: config.role,
        },
      },
    );

    const handle: AgentHandle & { pid: number; promptFile?: string } = {
      id: agentId,
      pid: proc.pid,
      role: config.role,
      promptFile,
      kill: async () => {
        killProcess(proc.pid);
        // Clean up temp prompt file
        try {
          rmSync(tmpDir, { recursive: true });
        } catch {
          // ignore cleanup errors
        }
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
    return isAlive(handle.pid) ? "running" : "stopped";
  }

  async listActive(): Promise<AgentHandle[]> {
    const active: AgentHandle[] = [];
    for (const [id, handle] of this.handles) {
      if (isAlive(handle.pid)) {
        active.push(handle);
      } else {
        this.handles.delete(id);
      }
    }
    return active;
  }
}
