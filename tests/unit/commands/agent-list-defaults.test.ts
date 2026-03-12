import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { listAgentsFiltered, getLatestAgentPerModule } from "../../../src/db/queries/agent-queries.js";
import { getMostRecentRunId } from "../../../src/db/queries/agent-queries.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("agent list default behavior", () => {
  test("getMostRecentRunId returns null when no runs exist", () => {
    const runId = getMostRecentRunId(db);
    expect(runId).toBeNull();
  });

  test("getMostRecentRunId returns the most recently created run", () => {
    const run1 = createRun(db, { spec_id: "spec_1" });
    const run2 = createRun(db, { spec_id: "spec_2" });

    const runId = getMostRecentRunId(db);
    expect(runId).toBe(run2.id);
  });

  test("default listing (no options) shows latest agent per module from most recent run", () => {
    // Create two runs
    const run1 = createRun(db, { spec_id: "spec_1" });
    const run2 = createRun(db, { spec_id: "spec_2" });

    // Create agents in run1 (old run)
    createAgent(db, { agent_id: "", run_id: run1.id, role: "builder", name: "b-old-parser", module_id: "parser", system_prompt: "p" });

    // Create agents in run2 (most recent) - two attempts for same module
    const a1 = createAgent(db, { agent_id: "", run_id: run2.id, role: "builder", name: "b-parser-v1", module_id: "parser", system_prompt: "p" });
    db.prepare("UPDATE agents SET status = 'failed' WHERE id = ?").run(a1.id);
    createAgent(db, { agent_id: "", run_id: run2.id, role: "builder", name: "b-parser-v2", module_id: "parser", system_prompt: "p" });
    createAgent(db, { agent_id: "", run_id: run2.id, role: "builder", name: "b-lexer", module_id: "lexer", system_prompt: "p" });

    // Get latest agents per module for the most recent run
    const latestRunId = getMostRecentRunId(db)!;
    expect(latestRunId).toBe(run2.id);

    const agents = getLatestAgentPerModule(db, latestRunId);

    // Should NOT include agents from run1
    expect(agents.find(a => a.name === "b-old-parser")).toBeUndefined();

    // Should include latest parser attempt (v2) and lexer from run2
    const parserAgents = agents.filter(a => a.module_id === "parser");
    expect(parserAgents).toHaveLength(1);
    expect(parserAgents[0].name).toBe("b-parser-v2");

    const lexerAgents = agents.filter(a => a.module_id === "lexer");
    expect(lexerAgents).toHaveLength(1);
    expect(lexerAgents[0].name).toBe("b-lexer");
  });

  test("when --run-id is specified, lists all agents for that run (no dedup)", () => {
    const run1 = createRun(db, { spec_id: "spec_1" });

    // Create two attempts for same module
    const a1 = createAgent(db, { agent_id: "", run_id: run1.id, role: "builder", name: "b-parser-v1", module_id: "parser", system_prompt: "p" });
    db.prepare("UPDATE agents SET status = 'failed' WHERE id = ?").run(a1.id);
    createAgent(db, { agent_id: "", run_id: run1.id, role: "builder", name: "b-parser-v2", module_id: "parser", system_prompt: "p" });

    // listAgentsFiltered with runId returns all for that run
    const agents = listAgentsFiltered(db, { runId: run1.id });
    const parserAgents = agents.filter(a => a.module_id === "parser");
    expect(parserAgents).toHaveLength(2);
  });
});
