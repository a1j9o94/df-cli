import { test, expect, describe, beforeEach } from "bun:test";
import { getDbForTest, type SqliteDb } from "../../../src/db/index.js";
import { getRunWithSpecTitle, getModuleProgress } from "../../../src/db/queries/status-queries.js";
import { summarizeAgentCounts } from "../../../src/utils/agent-enrichment.js";
import { formatModuleProgressInline } from "../../../src/utils/format-module-progress.js";
import { statusCommand } from "../../../src/commands/status.js";
import type { AgentRecord } from "../../../src/types/agent.js";

describe("dark status enriched", () => {
  let db: SqliteDb;
  const runId = "run_01TEST";
  const specId = "spec_01TEST";

  beforeEach(() => {
    db = getDbForTest();

    // Create a spec with title
    db.prepare(
      "INSERT INTO specs (id, title, status, file_path) VALUES (?, ?, ?, ?)"
    ).run(specId, "Enrich CLI output: never need raw sqlite", "building", ".df/specs/spec_01TEST.md");

    // Create a run
    db.prepare(
      "INSERT INTO runs (id, spec_id, status, current_phase, cost_usd, budget_usd, tokens_used, iteration, max_iterations) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(runId, specId, "running", "build", 1.33, 15.0, 50234, 1, 3);

    // Create agents for the buildplan
    const architectId = "agt_ARCH";
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(architectId, runId, "architect", "architect", "completed", new Date().toISOString(), new Date().toISOString());

    // Create a buildplan with modules
    db.prepare(
      `INSERT INTO buildplans (id, run_id, spec_id, architect_agent_id, version, status, plan, module_count, contract_count, max_parallel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "bp_01", runId, specId, architectId, 1, "active",
      JSON.stringify({
        modules: [
          { id: "merge-lock", title: "Merge Lock" },
          { id: "engine-rebase", title: "Engine Rebase" },
          { id: "queue-vis", title: "Queue Visibility" },
        ]
      }),
      3, 0, 3
    );

    // A dead agent from a previous attempt (inserted first = lower rowid)
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, module_id, error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("agt_DEAD", runId, "builder", "builder-merge-lock-old", "killed", "merge-lock", "stale",
      new Date(Date.now() - 600000).toISOString(), new Date().toISOString());

    // Create builder agents for modules (inserted after dead agent = higher rowid)
    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, module_id, cost_usd, tokens_used, total_active_ms, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("agt_B1", runId, "builder", "builder-merge-lock", "completed", "merge-lock", 0.45, 10000, 180000,
      new Date(Date.now() - 300000).toISOString(), new Date().toISOString());

    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, module_id, cost_usd, tokens_used, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("agt_B2", runId, "builder", "builder-engine-rebase", "running", "engine-rebase", 0.62, 15000,
      new Date(Date.now() - 740000).toISOString(), new Date().toISOString());

    db.prepare(
      `INSERT INTO agents (id, run_id, role, name, status, module_id, cost_usd, tokens_used, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("agt_B3", runId, "builder", "builder-queue-vis", "running", "queue-vis", 0.26, 8000,
      new Date(Date.now() - 660000).toISOString(), new Date().toISOString());
  });

  describe("spec title in status", () => {
    test("getRunWithSpecTitle includes spec title", () => {
      const run = getRunWithSpecTitle(db, runId);
      expect(run).not.toBeNull();
      expect(run!.spec_title).toBe("Enrich CLI output: never need raw sqlite");
    });

    test("getRunWithSpecTitle returns null title if spec not in DB", () => {
      // Create run with spec that doesn't exist in specs table
      db.prepare(
        "INSERT INTO runs (id, spec_id, status) VALUES (?, ?, ?)"
      ).run("run_ORPHAN", "spec_MISSING", "running");

      const run = getRunWithSpecTitle(db, "run_ORPHAN");
      expect(run).not.toBeNull();
      expect(run!.spec_title).toBeNull();
    });
  });

  describe("module progress", () => {
    test("getModuleProgress returns entries for all buildplan modules", () => {
      const progress = getModuleProgress(db, runId);
      expect(progress.length).toBe(3);
    });

    test("module progress shows completed module as completed", () => {
      const progress = getModuleProgress(db, runId);
      const mergeLock = progress.find(m => m.moduleId === "merge-lock");
      expect(mergeLock).toBeDefined();
      expect(mergeLock!.status).toBe("completed");
    });

    test("module progress shows running modules with elapsed", () => {
      const progress = getModuleProgress(db, runId);
      const engineRebase = progress.find(m => m.moduleId === "engine-rebase");
      expect(engineRebase).toBeDefined();
      expect(engineRebase!.status).toBe("running");
      expect(engineRebase!.elapsedMs).toBeGreaterThan(0);
    });

    test("formatModuleProgressInline formats correctly", () => {
      const progress = getModuleProgress(db, runId);
      const output = formatModuleProgressInline(progress);
      expect(output).toContain("merge-lock(done)");
      expect(output).toMatch(/engine-rebase\(building \d+m \d+s\)/);
      expect(output).toMatch(/queue-vis\(building \d+m \d+s\)/);
    });
  });

  describe("agent count breakdown", () => {
    test("summarizeAgentCounts breaks down active/completed/dead", () => {
      const agents = db.prepare("SELECT * FROM agents WHERE run_id = ?").all(runId) as AgentRecord[];
      const counts = summarizeAgentCounts(agents);
      expect(counts.active).toBe(2); // 2 running builders
      expect(counts.completed).toBe(2); // architect + merge-lock builder
      expect(counts.dead).toBe(1); // killed old builder
      expect(counts.summary).toBe("2 active, 2 completed, 1 dead");
    });
  });

  describe("--detail flag", () => {
    test("statusCommand accepts --detail flag", () => {
      const detailOpt = statusCommand.options.find(o => o.long === "--detail");
      expect(detailOpt).toBeDefined();
    });
  });
});
