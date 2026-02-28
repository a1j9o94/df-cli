import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import { createRun } from "../../../../src/db/queries/runs.js";
import { createAgent } from "../../../../src/db/queries/agents.js";
import { createBuildplan } from "../../../../src/db/queries/buildplans.js";
import {
  createContract, getContract, listContracts, updateContractContent,
  createBinding, acknowledgeContract, getBindingsForAgent, getBindingsForContract,
  createDependency, satisfyDependency, getDependenciesForBuilder, getUnsatisfiedDependencies,
} from "../../../../src/db/queries/contracts.js";
import type { SqliteDb } from "../../../../src/db/index.js";

let db: SqliteDb;
let runId: string;
let planId: string;
let builderId: string;

const PLAN_JSON = JSON.stringify({
  spec_id: "s1", modules: [{ id: "m1", title: "M1", description: "", scope: { creates: [], modifies: [], test_files: [] }, estimated_complexity: "low", estimated_tokens: 100, estimated_duration_min: 1 }],
  contracts: [], dependencies: [],
  parallelism: { max_concurrent: 1, parallel_groups: [], critical_path: [], critical_path_estimated_min: 1 },
  integration_strategy: { checkpoints: [], final_integration: "" }, risks: [],
  total_estimated_tokens: 100, total_estimated_cost_usd: 0.1, total_estimated_duration_min: 1,
});

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "s1" }).id;
  const archId = createAgent(db, { run_id: runId, role: "architect", name: "a1", system_prompt: "p" }).id;
  planId = createBuildplan(db, runId, "s1", archId, PLAN_JSON).id;
  builderId = createAgent(db, { run_id: runId, role: "builder", name: "b1", system_prompt: "p" }).id;
});

describe("contracts queries", () => {
  test("createContract inserts and returns a contract", () => {
    const c = createContract(db, runId, planId, "AST Types", "Type defs", "typescript", "interface AST {}");
    expect(c.id).toMatch(/^ctr_/);
    expect(c.name).toBe("AST Types");
    expect(c.version).toBe(1);
  });

  test("getContract returns null for missing", () => {
    expect(getContract(db, "nope")).toBeNull();
  });

  test("listContracts filters", () => {
    createContract(db, runId, planId, "C1", "d", "ts", "content");
    createContract(db, runId, planId, "C2", "d", "ts", "content");
    expect(listContracts(db)).toHaveLength(2);
    expect(listContracts(db, runId)).toHaveLength(2);
    expect(listContracts(db, undefined, planId)).toHaveLength(2);
  });

  test("updateContractContent bumps version", () => {
    const c = createContract(db, runId, planId, "C1", "d", "ts", "v1");
    updateContractContent(db, c.id, "v2", "Changed field type");
    const updated = getContract(db, c.id)!;
    expect(updated.content).toBe("v2");
    expect(updated.version).toBe(2);
  });
});

describe("bindings queries", () => {
  test("createBinding and acknowledgeContract", () => {
    const c = createContract(db, runId, planId, "C1", "d", "ts", "content");
    const binding = createBinding(db, c.id, builderId, "m1", "consumer");
    expect(binding.acknowledged).toBe(false);

    acknowledgeContract(db, c.id, builderId);
    const bindings = getBindingsForAgent(db, builderId);
    expect(bindings).toHaveLength(1);
    expect(bindings[0].acknowledged).toBe(true);
    expect(bindings[0].acknowledged_at).toBeTruthy();
  });

  test("getBindingsForContract returns all bindings", () => {
    const c = createContract(db, runId, planId, "C1", "d", "ts", "content");
    const b2 = createAgent(db, { run_id: runId, role: "builder", name: "b2", system_prompt: "p" }).id;
    createBinding(db, c.id, builderId, "m1", "implementer");
    createBinding(db, c.id, b2, "m2", "consumer");
    expect(getBindingsForContract(db, c.id)).toHaveLength(2);
  });
});

describe("dependencies queries", () => {
  test("createDependency and satisfyDependency", () => {
    const dep = createDependency(db, runId, builderId, "m0", "completion");
    expect(dep.satisfied).toBe(false);

    satisfyDependency(db, dep.id);
    const deps = getDependenciesForBuilder(db, builderId);
    expect(deps).toHaveLength(1);
    expect(deps[0].satisfied).toBe(true);
    expect(deps[0].satisfied_at).toBeTruthy();
  });

  test("getUnsatisfiedDependencies filters correctly", () => {
    const d1 = createDependency(db, runId, builderId, "m0", "completion");
    createDependency(db, runId, builderId, "m1", "contract");
    satisfyDependency(db, d1.id);

    expect(getUnsatisfiedDependencies(db, builderId)).toHaveLength(1);
    expect(getDependenciesForBuilder(db, builderId)).toHaveLength(2);
  });
});
