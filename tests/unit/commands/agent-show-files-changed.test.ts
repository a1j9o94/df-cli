import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createAgent, updateAgentPid } from "../../../src/db/queries/agents.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { getAgentDetail } from "../../../src/db/queries/agent-queries.js";
import { formatAgentDetail } from "../../../src/utils/format-agent-detail.js";
import type { SqliteDb } from "../../../src/db/index.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_1" }).id;
});

describe("agent show files changed", () => {
  test("formatAgentDetail shows files changed count when provided", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-foo",
      module_id: "foo",
      worktree_path: "/tmp/foo",
      system_prompt: "Build foo",
    });
    updateAgentPid(db, agent.id, 1234);

    const detail = getAgentDetail(db, agent.id)!;
    const output = formatAgentDetail(detail, { filesChanged: 3 });

    // Should contain a Files line
    expect(output).toMatch(/Files:\s+3 files/);
  });

  test("formatAgentDetail shows 0 files when no files changed", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-bar",
      worktree_path: "/tmp/bar",
      system_prompt: "Build bar",
    });

    const detail = getAgentDetail(db, agent.id)!;
    const output = formatAgentDetail(detail, { filesChanged: 0 });

    expect(output).toMatch(/Files:\s+0 files/);
  });

  test("formatAgentDetail shows files as dash when filesChanged is undefined (no worktree)", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "architect",
      name: "architect-main",
      system_prompt: "Architect prompt",
    });

    const detail = getAgentDetail(db, agent.id)!;
    // No filesChanged option provided
    const output = formatAgentDetail(detail);

    expect(output).toMatch(/Files:\s+-/);
  });

  test("files field appears between Tokens and TDD Phase lines", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-baz",
      module_id: "baz",
      worktree_path: "/tmp/baz",
      system_prompt: "Build baz",
    });

    const detail = getAgentDetail(db, agent.id)!;
    const output = formatAgentDetail(detail, { filesChanged: 5 });

    const lines = output.split("\n");
    const tokensIdx = lines.findIndex(l => l.includes("Tokens:"));
    const filesIdx = lines.findIndex(l => l.includes("Files:"));
    const tddPhaseIdx = lines.findIndex(l => l.includes("TDD Phase:"));

    expect(tokensIdx).toBeGreaterThan(-1);
    expect(filesIdx).toBeGreaterThan(-1);
    expect(tddPhaseIdx).toBeGreaterThan(-1);
    expect(filesIdx).toBeGreaterThan(tokensIdx);
    expect(filesIdx).toBeLessThan(tddPhaseIdx);
  });

  test("formatAgentDetail still works without options (backward compatible)", () => {
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-compat",
      system_prompt: "Build compat",
    });

    const detail = getAgentDetail(db, agent.id)!;
    // Call without second argument - should not throw
    const output = formatAgentDetail(detail);
    expect(output).toContain("builder-compat");
    expect(output).toContain("Files:");
  });
});
