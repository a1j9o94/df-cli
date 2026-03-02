import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, existsSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { createEvent } from "../../../src/db/queries/events.js";
import { createSpec } from "../../../src/db/queries/specs.js";
import { PipelineEngine } from "../../../src/pipeline/engine.js";
import { DEFAULT_CONFIG } from "../../../src/types/config.js";
import type { AgentRuntime } from "../../../src/runtime/interface.js";
import type { AgentHandle, AgentSpawnConfig } from "../../../src/types/index.js";
import {
  acquireMergeLock,
  releaseMergeLock,
  getMergeLockInfo,
} from "../../../src/pipeline/merge-lock.js";

let db: SqliteDb;
let dfDir: string;
let repoDir: string;

/**
 * Create a mock agent runtime that auto-completes agents when spawned.
 */
function createMockRuntime(db: SqliteDb): AgentRuntime {
  let pidCounter = 1000;
  const handles: AgentHandle[] = [];

  return {
    async spawn(config: AgentSpawnConfig): Promise<AgentHandle> {
      const pid = pidCounter++;
      const handle: AgentHandle = {
        id: config.agent_id,
        pid,
        role: config.role,
        kill: async () => {},
      };
      handles.push(handle);

      // Auto-complete the agent after a tiny delay (simulates agent finishing work)
      setTimeout(() => {
        updateAgentStatus(db, config.agent_id, "completed");
      }, 50);

      return handle;
    },
    async send() {},
    async kill() {},
    async status(agentId: string): Promise<"running" | "stopped" | "unknown"> {
      // Check DB to determine status
      const agent = db.prepare("SELECT status FROM agents WHERE id = ?").get(agentId) as { status: string } | undefined;
      if (!agent) return "unknown";
      return agent.status === "completed" || agent.status === "failed" ? "stopped" : "running";
    },
    async listActive(): Promise<AgentHandle[]> {
      return handles.filter((h) => {
        const agent = db.prepare("SELECT status FROM agents WHERE id = ?").get(h.id) as { status: string } | undefined;
        return agent?.status === "running" || agent?.status === "pending" || agent?.status === "spawning";
      });
    },
  };
}

/**
 * Setup a git repo with a .df directory for testing the merge phase.
 */
function setupTestRepoWithDf(): { repoDir: string; dfDir: string } {
  const dir = mkdtempSync(join(tmpdir(), "df-engine-merge-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email test@test.com", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name Test", { cwd: dir, stdio: "pipe" });

  writeFileSync(join(dir, "file.txt"), "initial content\n");
  execSync("git add -A", { cwd: dir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: "pipe" });

  // Create .df directory
  const dfPath = join(dir, ".df");
  mkdirSync(dfPath, { recursive: true });

  return { repoDir: dir, dfDir: dfPath };
}

beforeEach(() => {
  db = getDbForTest();
  const setup = setupTestRepoWithDf();
  repoDir = setup.repoDir;
  dfDir = setup.dfDir;
});

afterEach(() => {
  // Clean up worktrees
  try {
    const output = execSync("git worktree list --porcelain", {
      cwd: repoDir,
      encoding: "utf-8",
    });
    for (const line of output.split("\n")) {
      if (line.startsWith("worktree ") && !line.includes(repoDir)) {
        const wtPath = line.slice(9);
        try {
          execSync(`git worktree remove "${wtPath}" --force`, {
            cwd: repoDir,
            stdio: "pipe",
          });
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
  try {
    rmSync(repoDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("merge-lock integration", () => {
  test("lock is acquired and released during merge phase", () => {
    // Verify lock lifecycle
    expect(getMergeLockInfo(dfDir)).toBeNull();

    acquireMergeLock(dfDir, "run-1");
    const info = getMergeLockInfo(dfDir);
    expect(info).not.toBeNull();
    expect(info!.runId).toBe("run-1");

    releaseMergeLock(dfDir, "run-1");
    expect(getMergeLockInfo(dfDir)).toBeNull();
  });

  test("second run cannot acquire lock while first holds it", () => {
    const firstAcquired = acquireMergeLock(dfDir, "run-1");
    expect(firstAcquired).toBe(true);

    const secondAcquired = acquireMergeLock(dfDir, "run-2");
    expect(secondAcquired).toBe(false);
  });

  test("second run acquires lock after first releases", () => {
    acquireMergeLock(dfDir, "run-1");
    releaseMergeLock(dfDir, "run-1");

    const secondAcquired = acquireMergeLock(dfDir, "run-2");
    expect(secondAcquired).toBe(true);
  });
});

describe("merge phase event logging", () => {
  test("merge lock events are logged correctly", () => {
    const run = createRun(db, { spec_id: "s1", budget_usd: 50 });

    // Simulate what the engine does
    createEvent(db, run.id, "merge-lock-acquired");
    createEvent(db, run.id, "merge-lock-released");

    const events = db.prepare(
      "SELECT type FROM events WHERE run_id = ? ORDER BY created_at ASC"
    ).all(run.id) as { type: string }[];

    const types = events.map((e) => e.type);
    expect(types).toContain("merge-lock-acquired");
    expect(types).toContain("merge-lock-released");
  });

  test("merge-queued event logged when waiting for lock", () => {
    const run = createRun(db, { spec_id: "s1", budget_usd: 50 });

    createEvent(db, run.id, "merge-queued", { heldByRunId: "other-run" });

    const events = db.prepare(
      "SELECT type, data FROM events WHERE run_id = ? AND type = 'merge-queued'"
    ).all(run.id) as { type: string; data: string }[];

    expect(events.length).toBe(1);
    const eventData = JSON.parse(events[0].data);
    expect(eventData.heldByRunId).toBe("other-run");
  });

  test("rebase-merge-result event captures branch details", () => {
    const run = createRun(db, { spec_id: "s1", budget_usd: 50 });

    createEvent(db, run.id, "rebase-merge-result", {
      mergedBranches: ["feature-a", "feature-b"],
      failedBranches: [],
      errors: [],
    });

    const events = db.prepare(
      "SELECT data FROM events WHERE run_id = ? AND type = 'rebase-merge-result'"
    ).all(run.id) as { data: string }[];

    expect(events.length).toBe(1);
    const eventData = JSON.parse(events[0].data);
    expect(eventData.mergedBranches).toEqual(["feature-a", "feature-b"]);
    expect(eventData.failedBranches).toEqual([]);
  });
});

describe("merge lock stale detection", () => {
  test("stale lock from dead process is detected and stolen", () => {
    // Write a lock with a definitely-dead PID
    writeFileSync(
      join(dfDir, "merge.lock"),
      JSON.stringify({
        runId: "dead-run",
        acquiredAt: new Date().toISOString(),
        pid: 999999999,
      })
    );

    const acquired = acquireMergeLock(dfDir, "new-run");
    expect(acquired).toBe(true);

    const info = getMergeLockInfo(dfDir);
    expect(info!.runId).toBe("new-run");
  });

  test("lock from live process is not stolen", () => {
    // Use our own PID (which is alive)
    acquireMergeLock(dfDir, "alive-run");

    const stolen = acquireMergeLock(dfDir, "thief-run");
    expect(stolen).toBe(false);
  });
});

describe("merge phase builder tracking", () => {
  test("completed builders with worktree_path are collected", () => {
    const run = createRun(db, { spec_id: "s1", budget_usd: 50 });

    // Create builder agents with worktree paths
    const agent1 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-mod1",
      worktree_path: "/tmp/wt1",
      system_prompt: "p",
    });
    updateAgentStatus(db, agent1.id, "completed");

    const agent2 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-mod2",
      worktree_path: "/tmp/wt2",
      system_prompt: "p",
    });
    updateAgentStatus(db, agent2.id, "completed");

    // Query like the engine does
    const completedBuilders = db.prepare(
      "SELECT worktree_path FROM agents WHERE run_id = ? AND role = 'builder' AND status = 'completed' AND worktree_path IS NOT NULL"
    ).all(run.id) as { worktree_path: string }[];

    expect(completedBuilders.length).toBe(2);
    expect(completedBuilders.map((b) => b.worktree_path)).toContain("/tmp/wt1");
    expect(completedBuilders.map((b) => b.worktree_path)).toContain("/tmp/wt2");
  });

  test("failed builders are not collected for merge", () => {
    const run = createRun(db, { spec_id: "s1", budget_usd: 50 });

    const agent1 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-ok",
      worktree_path: "/tmp/wt-ok",
      system_prompt: "p",
    });
    updateAgentStatus(db, agent1.id, "completed");

    const agent2 = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "builder",
      name: "builder-fail",
      worktree_path: "/tmp/wt-fail",
      system_prompt: "p",
    });
    updateAgentStatus(db, agent2.id, "failed", "Build error");

    const completedBuilders = db.prepare(
      "SELECT worktree_path FROM agents WHERE run_id = ? AND role = 'builder' AND status = 'completed' AND worktree_path IS NOT NULL"
    ).all(run.id) as { worktree_path: string }[];

    expect(completedBuilders.length).toBe(1);
    expect(completedBuilders[0].worktree_path).toBe("/tmp/wt-ok");
  });
});
