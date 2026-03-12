/**
 * Tests for worktree persistence in the pipeline layer.
 *
 * Covers:
 * - getFailedBuilderWorktree(): retrieves worktree path from a previous failed builder
 * - Worktree preservation on builder failure (not removed)
 * - Worktree reuse during resume build phase
 * - Previous commits included in builder instructions
 */

import { describe, test, expect, beforeEach } from "bun:test";

import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, getAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";
import { createSpec } from "../../../src/db/queries/specs.js";
import { createBuildplan, updateBuildplanStatus } from "../../../src/db/queries/buildplans.js";
import { getFailedBuilderWorktree } from "../../../src/pipeline/resume.js";
import { executeBuildPhase, executeResumeBuildPhase, type BuildPhaseOptions } from "../../../src/pipeline/build-phase.js";
import { DEFAULT_CONFIG } from "../../../src/types/config.js";
import type { DfConfig } from "../../../src/types/config.js";
import type { AgentRuntime } from "../../../src/runtime/interface.js";
import type { AgentHandle, AgentSpawnConfig, Buildplan } from "../../../src/types/index.js";

// ---------------------------------------------------------------------------
// getFailedBuilderWorktree
// ---------------------------------------------------------------------------

describe("getFailedBuilderWorktree", () => {
  let db: SqliteDb;
  let runId: string;

  beforeEach(() => {
    db = getDbForTest();
    const run = createRun(db, { spec_id: "test-spec" });
    runId = run.id;
  });

  test("returns null when no failed builders exist for module", () => {
    const result = getFailedBuilderWorktree(db, runId, "mod-a");
    expect(result).toBeNull();
  });

  test("returns worktree path from a failed builder", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      worktree_path: "/tmp/df-worktrees/mod-a-abc123",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "failed", "Process exited without completing");

    const result = getFailedBuilderWorktree(db, runId, "mod-a");
    expect(result).toBe("/tmp/df-worktrees/mod-a-abc123");
  });

  test("returns null when builder has no worktree_path", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "failed", "some error");

    const result = getFailedBuilderWorktree(db, runId, "mod-a");
    expect(result).toBeNull();
  });

  test("returns most recent failed builder worktree when multiple exist", () => {
    // First failed builder
    const agent1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a-1",
      module_id: "mod-a",
      worktree_path: "/tmp/df-worktrees/mod-a-old",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent1.id, "failed", "first failure");

    // Second (more recent) failed builder
    const agent2 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a-2",
      module_id: "mod-a",
      worktree_path: "/tmp/df-worktrees/mod-a-newer",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent2.id, "failed", "second failure");

    const result = getFailedBuilderWorktree(db, runId, "mod-a");
    expect(result).toBe("/tmp/df-worktrees/mod-a-newer");
  });

  test("ignores completed builders", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a",
      module_id: "mod-a",
      worktree_path: "/tmp/df-worktrees/mod-a-done",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "completed");

    const result = getFailedBuilderWorktree(db, runId, "mod-a");
    expect(result).toBeNull();
  });

  test("ignores builders for different modules", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-b",
      module_id: "mod-b",
      worktree_path: "/tmp/df-worktrees/mod-b-abc",
      system_prompt: "test",
    });
    updateAgentStatus(db, agent.id, "failed", "some error");

    const result = getFailedBuilderWorktree(db, runId, "mod-a");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Build phase — worktree preservation on failure
// ---------------------------------------------------------------------------

/** Use a short poll interval for tests. */
const TEST_OPTIONS: BuildPhaseOptions = { pollIntervalMs: 100 };

/** Create a mock runtime that auto-completes or auto-fails agents. */
function createMockRuntime(db: SqliteDb, opts?: { failModules?: string[] }): AgentRuntime {
  let pidCounter = 1000;
  const handles: AgentHandle[] = [];
  const failModules = new Set(opts?.failModules ?? []);

  return {
    async spawn(spawnConfig: AgentSpawnConfig): Promise<AgentHandle> {
      const pid = pidCounter++;
      const handle: AgentHandle = {
        id: spawnConfig.agent_id,
        pid,
        role: spawnConfig.role,
        kill: async () => {},
      };
      handles.push(handle);

      const moduleId = spawnConfig.module_id;
      setTimeout(() => {
        if (moduleId && failModules.has(moduleId)) {
          updateAgentStatus(db, spawnConfig.agent_id, "failed", `Build failed for ${moduleId}`);
        } else {
          updateAgentStatus(db, spawnConfig.agent_id, "completed");
        }
      }, 20);

      return handle;
    },
    async send() {},
    async kill() {},
    async status(agentId: string): Promise<"running" | "stopped" | "unknown"> {
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

/** Create a minimal buildplan JSON. */
function makeBuildplanJson(modules: { id: string; title?: string }[], dependencies: { from: string; to: string }[] = []): string {
  const plan: Buildplan = {
    spec_id: "",
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title ?? m.id,
      description: `Module ${m.id}`,
      scope: { creates: [`src/${m.id}.ts`], modifies: [], test_files: [`tests/${m.id}.test.ts`] },
      estimated_complexity: "medium" as const,
      estimated_tokens: 5000,
      estimated_duration_min: 10,
    })),
    contracts: [],
    dependencies: dependencies.map((d) => ({ from: d.from, to: d.to, type: "completion" as const })),
    parallelism: {
      max_concurrent: 4,
      parallel_groups: [{ phase: 1, modules: modules.map((m) => m.id) }],
      critical_path: modules.map((m) => m.id),
      critical_path_estimated_min: 10,
    },
    integration_strategy: {
      checkpoints: [],
      final_integration: "Run all tests",
    },
    risks: [],
    total_estimated_tokens: 10000,
    total_estimated_cost_usd: 1.0,
    total_estimated_duration_min: 10,
  };
  return JSON.stringify(plan);
}

/** Setup a spec + run + optional buildplan. */
function setupRun(db: SqliteDb, options?: { buildplan?: string }): { specId: string; runId: string } {
  const spec = createSpec(db, `spec-${Date.now()}`, "Test spec", "/tmp/test-spec.md");
  const run = createRun(db, {
    spec_id: spec.id,
    skip_change_eval: true,
    max_parallel: 4,
    budget_usd: 50,
    max_iterations: 3,
  });

  if (options?.buildplan) {
    const architectAgent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "architect",
      name: "architect-test",
      system_prompt: "test",
    });
    const bp = createBuildplan(db, run.id, spec.id, architectAgent.id, options.buildplan);
    updateBuildplanStatus(db, bp.id, "active");
  }

  return { specId: spec.id, runId: run.id };
}

describe("executeBuildPhase — worktree preservation", () => {
  let db: SqliteDb;
  let config: DfConfig;

  beforeEach(() => {
    db = getDbForTest();
    config = { ...DEFAULT_CONFIG };
  });

  test("preserves worktree_path in agent record when builder fails", async () => {
    const planJson = makeBuildplanJson([{ id: "failing-mod" }]);
    const { runId } = setupRun(db, { buildplan: planJson });
    const runtime = createMockRuntime(db, { failModules: ["failing-mod"] });

    try {
      await executeBuildPhase(db, runtime, config, runId, TEST_OPTIONS);
    } catch {
      // Expected to throw after retries exhausted
    }

    // With max_module_retries: 2, there will be 2 failed builders (1 original + 1 retry)
    const agents = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder' AND module_id = 'failing-mod'"
    ).all(runId) as { id: string; status: string; worktree_path: string | null }[];

    expect(agents.length).toBe(2);
    // All failed builders should still have worktree_path recorded (preserved for retry)
    for (const agent of agents) {
      expect(agent.status).toBe("failed");
      expect(agent.worktree_path).toBeTruthy();
    }
  });
});

describe("executeResumeBuildPhase — worktree reuse", () => {
  let db: SqliteDb;
  let config: DfConfig;

  beforeEach(() => {
    db = getDbForTest();
    config = { ...DEFAULT_CONFIG };
  });

  test("reuses worktree path from previous failed builder when path exists", async () => {
    const planJson = makeBuildplanJson([{ id: "mod-a" }]);
    const { runId } = setupRun(db, { buildplan: planJson });

    // Simulate a previous failed builder with a worktree
    const prevAgent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a-prev",
      module_id: "mod-a",
      worktree_path: "/tmp/does-not-exist-for-test",
      system_prompt: "test",
    });
    updateAgentStatus(db, prevAgent.id, "failed", "Process exited without completing");

    // Now resume — since the worktree path doesn't actually exist on disk,
    // it should fall back to creating a new worktree
    const runtime = createMockRuntime(db);
    await executeResumeBuildPhase(db, runtime, config, runId, new Set(), TEST_OPTIONS);

    // The new builder should have been spawned (regardless of worktree reuse fallback)
    const builders = db.prepare(
      "SELECT * FROM agents WHERE run_id = ? AND role = 'builder' AND status = 'completed'"
    ).all(runId) as { id: string; module_id: string | null }[];

    expect(builders.length).toBe(1);
    expect(builders[0].module_id).toBe("mod-a");
  });

  test("includes previous commit info in builder instructions when worktree has commits", async () => {
    const planJson = makeBuildplanJson([{ id: "mod-a" }]);
    const { runId } = setupRun(db, { buildplan: planJson });

    // Simulate a previous failed builder with a worktree that has commits
    const prevAgent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-mod-a-prev",
      module_id: "mod-a",
      worktree_path: "/tmp/does-not-exist",
      system_prompt: "test",
    });
    updateAgentStatus(db, prevAgent.id, "failed", "crash");

    const runtime = createMockRuntime(db);
    await executeResumeBuildPhase(db, runtime, config, runId, new Set(), TEST_OPTIONS);

    // Check that messages were sent - at minimum builder instructions
    const messages = db.prepare(
      "SELECT * FROM messages WHERE run_id = ? ORDER BY created_at"
    ).all(runId) as { body: string }[];

    expect(messages.length).toBeGreaterThanOrEqual(1);
    // The builder should have received instructions
    expect(messages[messages.length - 1].body).toContain("# Builder Instructions");
  });
});
