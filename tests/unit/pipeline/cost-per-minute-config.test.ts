/**
 * Tests that cost_per_minute is configurable via DfConfig.
 * The spec says: "Uses cost_per_minute from config (defaulting to 0.05)"
 */
import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent, getAgent } from "../../../src/db/queries/agents.js";
import { estimateAndRecordCost } from "../../../src/pipeline/budget.js";
import { DEFAULT_CONFIG } from "../../../src/types/config.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "s1", budget_usd: 50 }).id;
});

describe("cost_per_minute config", () => {
  test("DEFAULT_CONFIG includes cost_per_minute set to 0.05", () => {
    expect(DEFAULT_CONFIG.build.cost_per_minute).toBe(0.05);
  });

  test("estimateAndRecordCost accepts custom costPerMinute", () => {
    // Agent created 10 minutes ago
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "test",
    });
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(tenMinAgo, tenMinAgo, agent.id);

    // Use 4x the default rate ($0.20/min)
    const totalCost = estimateAndRecordCost(db, agent.id, 0.20);

    // 10 minutes * $0.20/min = $2.00
    expect(totalCost).toBeGreaterThan(1.8);
    expect(totalCost).toBeLessThan(2.2);
  });

  test("default costPerMinute produces $0.05/min rate", () => {
    // Agent created 10 minutes ago
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "b1",
      system_prompt: "test",
    });
    db.prepare("UPDATE agents SET created_at = ?, updated_at = ? WHERE id = ?").run(tenMinAgo, tenMinAgo, agent.id);

    // Default rate
    const totalCost = estimateAndRecordCost(db, agent.id);

    // 10 minutes * $0.05/min = $0.50
    expect(totalCost).toBeGreaterThan(0.4);
    expect(totalCost).toBeLessThan(0.6);
  });
});
