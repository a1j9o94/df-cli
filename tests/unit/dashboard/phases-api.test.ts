import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import { startServer, type ServerHandle } from "../../../src/dashboard/server.js";

function seedRun(
  db: InstanceType<typeof Database>,
  runId: string,
  opts: { phase: string; mode: string; moduleCount: number }
) {
  db.prepare(
    "INSERT INTO runs (id, spec_id, status, current_phase, mode, cost_usd, budget_usd, tokens_used, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(runId, "test-spec", "running", opts.phase, opts.mode, 0, 50, 0, new Date(Date.now() - 300000).toISOString(), new Date().toISOString());

  // Agent required for buildplan FK
  const agentId = `agt_${runId}`;
  db.prepare(
    "INSERT INTO agents (id, run_id, role, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(agentId, runId, "architect", "architect-1", "completed", new Date().toISOString(), new Date().toISOString());

  // Buildplan
  const modules = Array.from({ length: opts.moduleCount }, (_, i) => ({
    id: `mod-${i}`,
    title: `Module ${i}`,
    description: `Module ${i} desc`,
    scope: { creates: [] },
  }));
  const planJson = JSON.stringify({ modules, contracts: [], dependencies: [] });
  db.prepare(
    "INSERT INTO buildplans (id, run_id, spec_id, architect_agent_id, version, status, plan, module_count, contract_count, max_parallel, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(`plan_${runId}`, runId, "test-spec", agentId, 1, "active", planJson, opts.moduleCount, 0, opts.moduleCount, new Date().toISOString(), new Date().toISOString());
}

describe("Phases API endpoint", () => {
  let db: InstanceType<typeof Database>;
  let server: ServerHandle;

  beforeAll(async () => {
    db = new Database(":memory:");
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(SCHEMA_SQL);

    seedRun(db, "run_phase_test", { phase: "build", mode: "thorough", moduleCount: 3 });

    server = await startServer({ port: 0, db });
  });

  afterAll(() => {
    server.stop();
    db.close();
  });

  it("returns 200 for /api/runs/:id/phases", async () => {
    const resp = await fetch(`${server.url}/api/runs/run_phase_test/phases`);
    expect(resp.status).toBe(200);
  });

  it("returns a JSON array of phase objects", async () => {
    const resp = await fetch(`${server.url}/api/runs/run_phase_test/phases`);
    const phases = await resp.json();
    expect(Array.isArray(phases)).toBe(true);
    expect(phases.length).toBe(8);
  });

  it("each phase has id, label, and status fields", async () => {
    const resp = await fetch(`${server.url}/api/runs/run_phase_test/phases`);
    const phases = await resp.json();
    for (const phase of phases) {
      expect(phase).toHaveProperty("id");
      expect(phase).toHaveProperty("label");
      expect(phase).toHaveProperty("status");
    }
  });

  it("phases before current_phase are marked completed", async () => {
    const resp = await fetch(`${server.url}/api/runs/run_phase_test/phases`);
    const phases = await resp.json();
    const scout = phases.find((p: any) => p.id === "scout");
    const architect = phases.find((p: any) => p.id === "architect");
    const planReview = phases.find((p: any) => p.id === "plan-review");
    expect(scout.status).toBe("completed");
    expect(architect.status).toBe("completed");
    expect(planReview.status).toBe("completed");
  });

  it("current_phase is marked active", async () => {
    const resp = await fetch(`${server.url}/api/runs/run_phase_test/phases`);
    const phases = await resp.json();
    const build = phases.find((p: any) => p.id === "build");
    expect(build.status).toBe("active");
  });

  it("phases after current_phase are marked pending", async () => {
    const resp = await fetch(`${server.url}/api/runs/run_phase_test/phases`);
    const phases = await resp.json();
    const integrate = phases.find((p: any) => p.id === "integrate");
    const evalFunc = phases.find((p: any) => p.id === "evaluate-functional");
    const evalChange = phases.find((p: any) => p.id === "evaluate-change");
    const merge = phases.find((p: any) => p.id === "merge");
    expect(integrate.status).toBe("pending");
    expect(evalFunc.status).toBe("pending");
    expect(evalChange.status).toBe("pending");
    expect(merge.status).toBe("pending");
  });

  it("phase IDs match PHASE_ORDER from phases.ts", async () => {
    const resp = await fetch(`${server.url}/api/runs/run_phase_test/phases`);
    const phases = await resp.json();
    const ids = phases.map((p: any) => p.id);
    expect(ids).toEqual([
      "scout",
      "architect",
      "plan-review",
      "build",
      "integrate",
      "evaluate-functional",
      "evaluate-change",
      "merge",
    ]);
  });

  it("returns 404 for non-existent run", async () => {
    const resp = await fetch(`${server.url}/api/runs/nonexistent/phases`);
    expect(resp.status).toBe(404);
  });

  it("phase labels are human-readable (not raw IDs)", async () => {
    const resp = await fetch(`${server.url}/api/runs/run_phase_test/phases`);
    const phases = await resp.json();
    const labels = phases.map((p: any) => p.label);
    // Should not contain hyphens in labels (human-readable)
    expect(labels).toContain("Scout");
    expect(labels).toContain("Build");
    expect(labels).toContain("Merge");
    // plan-review should become "Plan Review" or similar
    const planReview = phases.find((p: any) => p.id === "plan-review");
    expect(planReview.label).not.toContain("-");
  });
});

describe("Phases API - skipped phases", () => {
  let db: InstanceType<typeof Database>;
  let server: ServerHandle;

  beforeAll(async () => {
    db = new Database(":memory:");
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(SCHEMA_SQL);

    seedRun(db, "run_skip_test", { phase: "build", mode: "quick", moduleCount: 1 });

    server = await startServer({ port: 0, db });
  });

  afterAll(() => {
    server.stop();
    db.close();
  });

  it("integrate phase is marked as skipped when module_count <= 1", async () => {
    const resp = await fetch(`${server.url}/api/runs/run_skip_test/phases`);
    const phases = await resp.json();
    const integrate = phases.find((p: any) => p.id === "integrate");
    expect(integrate.status).toBe("skipped");
  });

  it("evaluate-change phase is marked as skipped when mode is quick", async () => {
    const resp = await fetch(`${server.url}/api/runs/run_skip_test/phases`);
    const phases = await resp.json();
    const evalChange = phases.find((p: any) => p.id === "evaluate-change");
    expect(evalChange.status).toBe("skipped");
  });

  it("non-skippable phases retain their correct status", async () => {
    const resp = await fetch(`${server.url}/api/runs/run_skip_test/phases`);
    const phases = await resp.json();
    const scout = phases.find((p: any) => p.id === "scout");
    const build = phases.find((p: any) => p.id === "build");
    expect(scout.status).toBe("completed");
    expect(build.status).toBe("active");
  });
});
