import type { AgentHandle, AgentSpawnConfig } from "../types/index.js";

export interface AgentRuntime {
  spawn(config: AgentSpawnConfig): Promise<AgentHandle>;
  send(agentId: string, message: string): Promise<void>;
  kill(agentId: string): Promise<void>;
  status(agentId: string): Promise<"running" | "stopped" | "unknown">;
  listActive(): Promise<AgentHandle[]>;
}
