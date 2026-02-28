import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import { createRun } from "../../../../src/db/queries/runs.js";
import { createAgent } from "../../../../src/db/queries/agents.js";
import {
  createBuildplan, getBuildplan, getActiveBuildplan,
  listBuildplans, updateBuildplanStatus, reviewBuildplan,
} from "../../../../src/db/queries/buildplans.js";
import type { SqliteDb } from "../../../../src/db/index.js";

let db: SqliteDb;
let runId: string;
let architectId: string;

const SAMPLE_PLAN = JSON.stringify({
  spec_id: "s1",
  modules: [{ id: "m1", title: "Module 1", description: "test", scope: { creates: [], modifies: [], test_files: [] }, estimated_complexity: "low", estimated_tokens: 1000, estimated_duration_min: 5 }],
  contracts: [],
  dependencies: [],
  parallelism: { max_concurrent: 1, parallel_groups: [{ phase: 1, modules: ["m1"] }], critical_path: ["m1"], critical_path_estimated_min: 5 },
  integration_strategy: { checkpoints: [], final_integration: "test" },
  risks: [],
  total_estimated_tokens: 1000,
  total_estimated_cost_usd: 0.5,
  total_estimated_duration_min: 5,
});

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "s1" }).id;
  architectId = createAgent(db, { run_id: runId, role: "architect", name: "arch-1", system_prompt: "p" }).id;
});

describe("buildplans queries", () => {
  test("createBuildplan inserts and returns a buildplan", () => {
    const bp = createBuildplan(db, runId, "s1", architectId, SAMPLE_PLAN);
    expect(bp.id).toMatch(/^plan_/);
    expect(bp.run_id).toBe(runId);
    expect(bp.spec_id).toBe("s1");
    expect(bp.module_count).toBe(1);
    expect(bp.contract_count).toBe(0);
    expect(bp.status).toBe("draft");
    expect(bp.estimated_cost_usd).toBe(0.5);
  });

  test("getBuildplan returns null for missing", () => {
    expect(getBuildplan(db, "nonexistent")).toBeNull();
  });

  test("getActiveBuildplan returns active plan", () => {
    const bp = createBuildplan(db, runId, "s1", architectId, SAMPLE_PLAN);
    expect(getActiveBuildplan(db, "s1")).toBeNull();

    updateBuildplanStatus(db, bp.id, "active");
    const active = getActiveBuildplan(db, "s1");
    expect(active).not.toBeNull();
    expect(active!.id).toBe(bp.id);
  });

  test("listBuildplans filters by runId", () => {
    createBuildplan(db, runId, "s1", architectId, SAMPLE_PLAN);
    expect(listBuildplans(db, runId)).toHaveLength(1);
    expect(listBuildplans(db)).toHaveLength(1);
  });

  test("reviewBuildplan sets reviewer", () => {
    const bp = createBuildplan(db, runId, "s1", architectId, SAMPLE_PLAN);
    reviewBuildplan(db, bp.id, "orchestrator", "Looks good");
    const updated = getBuildplan(db, bp.id)!;
    expect(updated.reviewed_by).toBe("orchestrator");
    expect(updated.review_notes).toBe("Looks good");
  });
});
