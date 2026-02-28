import type { Subprocess } from "bun";

export interface ProcessHandle {
  pid: number;
  process: Subprocess;
  kill: () => void;
}

const activeProcesses = new Map<number, ProcessHandle>();

export function spawnProcess(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: Record<string, string>;
    stdout?: "pipe" | "inherit" | "ignore";
    stderr?: "pipe" | "inherit" | "ignore";
  },
): ProcessHandle {
  const proc = Bun.spawn([command, ...args], {
    cwd: options?.cwd,
    env: { ...process.env, ...options?.env },
    stdout: options?.stdout ?? "pipe",
    stderr: options?.stderr ?? "pipe",
  });

  const handle: ProcessHandle = {
    pid: proc.pid,
    process: proc,
    kill: () => {
      try {
        proc.kill();
      } catch {
        // Process may already be dead
      }
      activeProcesses.delete(proc.pid);
    },
  };

  activeProcesses.set(proc.pid, handle);
  return handle;
}

export function killProcess(pid: number, signal: number = 15): boolean {
  try {
    process.kill(pid, signal);
    activeProcesses.delete(pid);
    return true;
  } catch {
    activeProcesses.delete(pid);
    return false;
  }
}

export function isAlive(pid: number): boolean {
  try {
    // Signal 0 tests for process existence without sending a signal
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function getOutput(proc: Subprocess): Promise<string> {
  if (!proc.stdout || typeof proc.stdout === "number") return "";
  const text = await new Response(proc.stdout).text();
  return text;
}

export function getActiveProcesses(): Map<number, ProcessHandle> {
  return activeProcesses;
}
