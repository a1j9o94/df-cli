import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import { createRun, getRun, updateRunStatus, updateRunPhase } from "../../../src/db/queries/runs.js";
import { createEvent, listEvents } from "../../../src/db/queries/events.js";
import { createAgent, updateAgentStatus } from "../../../src/db/queries/agents.js";

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

function setupRun(db: InstanceType<typeof Database>) {
  const specId = "spec_test";
  db.prepare(
    "INSERT INTO specs (id, title, status, file_path) VALUES (?, ?, ?, ?)"
  ).run(specId, "Test Spec", "building", "/tmp/test.md");

  const run = createRun(db, { spec_id: specId, budget_usd: 50 });
  updateRunStatus(db, run.id, "running");
  updateRunPhase(db, run.id, "integrate");
  return getRun(db, run.id)!;
}

/**
 * Replicate the checkIntegrationGate logic from engine.ts for direct testing.
 * The engine method is private, so we test the same logic here.
 */
function checkIntegrationGate(db: InstanceType<typeof Database>, runId: string): void {
  const events = listEvents(db, runId);
  const integrationFailed = events.some((e) => e.type === "integration-failed");
  const integrationPassed = events.some((e) => e.type === "integration-passed");

  if (integrationFailed) {
    throw new Error("Integration gate failed: integration tests reported failure. Pipeline will not advance to evaluation.");
  }

  if (!integrationPassed) {
    throw new Error("Integration gate failed: no integration test results reported. Pipeline will not advance to evaluation.");
  }
}

describe("Integration gate - blocks pipeline on failure", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  test("integration gate passes when integration-passed event exists", () => {
    const run = setupRun(db);

    // Agent reports integration passed
    createEvent(db, run.id, "integration-passed", {
      checkpointsRun: 3,
      checkpointsPassed: 3,
    });

    expect(() => checkIntegrationGate(db, run.id)).not.toThrow();
  });

  test("integration gate throws when integration-failed event exists", () => {
    const run = setupRun(db);

    // Agent reports integration failed
    createEvent(db, run.id, "integration-failed", {
      checkpointsRun: 3,
      checkpointsPassed: 1,
    });

    expect(() => checkIntegrationGate(db, run.id)).toThrow(
      "Integration gate failed: integration tests reported failure"
    );
  });

  test("integration gate throws when no integration result events exist", () => {
    const run = setupRun(db);

    // No integration events at all
    expect(() => checkIntegrationGate(db, run.id)).toThrow(
      "Integration gate failed: no integration test results reported"
    );
  });

  test("integration gate throws on failure even if a passed event also exists", () => {
    const run = setupRun(db);

    // Both events exist (failure takes precedence)
    createEvent(db, run.id, "integration-passed", { checkpointsRun: 2, checkpointsPassed: 2 });
    createEvent(db, run.id, "integration-failed", { checkpointsRun: 1, checkpointsPassed: 0 });

    expect(() => checkIntegrationGate(db, run.id)).toThrow(
      "Integration gate failed: integration tests reported failure"
    );
  });

  test("integration gate only looks at events for the given run", () => {
    const run = setupRun(db);

    // Create a second run with passing integration
    db.prepare(
      "INSERT INTO specs (id, title, status, file_path) VALUES (?, ?, ?, ?)"
    ).run("spec_other", "Other Spec", "building", "/tmp/other.md");
    const otherRun = createRun(db, { spec_id: "spec_other", budget_usd: 50 });
    createEvent(db, otherRun.id, "integration-passed", { checkpointsRun: 1, checkpointsPassed: 1 });

    // Original run has no events — should fail
    expect(() => checkIntegrationGate(db, run.id)).toThrow(
      "no integration test results reported"
    );
  });

  test("pipeline would fail run when integration gate throws", () => {
    const run = setupRun(db);

    createEvent(db, run.id, "integration-failed", {
      checkpointsRun: 2,
      checkpointsPassed: 0,
    });

    // Simulate what the engine's catch block does
    try {
      checkIntegrationGate(db, run.id);
      // Should not reach here
      expect(true).toBe(false);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      updateRunStatus(db, run.id, "failed", error);
    }

    const failedRun = getRun(db, run.id)!;
    expect(failedRun.status).toBe("failed");
    expect(failedRun.error).toContain("integration tests reported failure");
  });

  test("phase does not advance past integrate on failure", () => {
    const run = setupRun(db);

    createEvent(db, run.id, "integration-failed", {
      checkpointsRun: 1,
      checkpointsPassed: 0,
    });

    // Simulate the engine phase loop — gate check throws, phase stays at integrate
    try {
      checkIntegrationGate(db, run.id);
      updateRunPhase(db, run.id, "evaluate-functional"); // Should NOT execute
    } catch {
      // Gate threw — phase should remain "integrate"
    }

    const current = getRun(db, run.id)!;
    expect(current.current_phase).toBe("integrate");
  });
});
