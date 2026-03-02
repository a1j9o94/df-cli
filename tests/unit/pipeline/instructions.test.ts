import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import { createSpec } from "../../../src/db/queries/specs.js";
import { getMessagesForAgent } from "../../../src/db/queries/messages.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { sendInstructions } from "../../../src/pipeline/instructions.js";

let db: SqliteDb;
let runId: string;
let agentId: string;

beforeEach(() => {
  db = getDbForTest();
  const spec = createSpec(db, "spec_instr", "Test Spec", ".df/specs/spec_instr.md");
  const run = createRun(db, { spec_id: spec.id });
  runId = run.id;
  const agent = createAgent(db, {
    agent_id: "",
    run_id: run.id,
    role: "builder",
    name: "test-builder",
    system_prompt: "test",
  });
  agentId = agent.id;
});

// ============================================================
// sendInstructions — basic behavior
// ============================================================
describe("sendInstructions", () => {
  test("creates a message in the DB for architect role", () => {
    sendInstructions(db, runId, agentId, "architect", {
      specFilePath: "/tmp/fake-spec.md",
    });

    const messages = getMessagesForAgent(db, agentId);
    expect(messages.length).toBe(1);
    expect(messages[0].from_agent_id).toBe("orchestrator");
    expect(messages[0].to_agent_id).toBe(agentId);
    expect(messages[0].body).toContain("# Architect Instructions");
    expect(messages[0].body).toContain("dark agent complete");
    expect(messages[0].body).toContain(agentId);
  });

  test("creates a message for builder role with module context", () => {
    sendInstructions(db, runId, agentId, "builder", {
      moduleId: "my-module",
      worktreePath: "/tmp/worktrees/my-module",
      contracts: ["ContractA"],
      scope: { creates: ["src/a.ts"], modifies: ["src/b.ts"], test_files: ["tests/a.test.ts"] },
    });

    const messages = getMessagesForAgent(db, agentId);
    expect(messages.length).toBe(1);
    expect(messages[0].body).toContain("# Builder Instructions");
    expect(messages[0].body).toContain("my-module");
    expect(messages[0].body).toContain("/tmp/worktrees/my-module");
    expect(messages[0].body).toContain("ContractA");
    expect(messages[0].body).toContain("src/a.ts");
    expect(messages[0].body).toContain("src/b.ts");
    expect(messages[0].body).toContain("tests/a.test.ts");
  });

  test("creates a message for evaluator role", () => {
    sendInstructions(db, runId, agentId, "evaluator", {});

    const messages = getMessagesForAgent(db, agentId);
    expect(messages.length).toBe(1);
    expect(messages[0].body).toContain("# Evaluator Instructions");
    expect(messages[0].body).toContain("dark scenario list");
    expect(messages[0].body).toContain("dark agent report-result");
    expect(messages[0].body).toContain(agentId);
  });

  test("creates a message for merger role with worktree paths", () => {
    sendInstructions(db, runId, agentId, "merger", {
      worktreePaths: ["/tmp/wt1", "/tmp/wt2"],
    });

    const messages = getMessagesForAgent(db, agentId);
    expect(messages.length).toBe(1);
    expect(messages[0].body).toContain("# Merger Instructions");
    expect(messages[0].body).toContain("/tmp/wt1");
    expect(messages[0].body).toContain("/tmp/wt2");
  });

  test("creates a message for integration-tester role", () => {
    sendInstructions(db, runId, agentId, "integration-tester", {});

    const messages = getMessagesForAgent(db, agentId);
    expect(messages.length).toBe(1);
    expect(messages[0].body).toContain("# Integration Tester Instructions");
    expect(messages[0].body).toContain("dark agent report-result");
    expect(messages[0].body).toContain(agentId);
  });

  test("creates a fallback message for unknown role", () => {
    sendInstructions(db, runId, agentId, "unknown-role", {});

    const messages = getMessagesForAgent(db, agentId);
    expect(messages.length).toBe(1);
    expect(messages[0].body).toContain("unknown-role");
    expect(messages[0].body).toContain("dark agent complete");
    expect(messages[0].body).toContain(agentId);
  });

  test("all messages include agent failure instructions", () => {
    const roles = ["architect", "builder", "evaluator", "merger", "integration-tester"] as const;
    for (const role of roles) {
      const spec = createSpec(db, `spec_${role}`, `Spec ${role}`, `.df/specs/spec_${role}.md`);
      const run = createRun(db, { spec_id: spec.id });
      const agent = createAgent(db, {
        agent_id: "",
        run_id: run.id,
        role,
        name: `test-${role}`,
        system_prompt: "test",
      });

      const context: Record<string, unknown> = {};
      if (role === "builder") {
        context.moduleId = "test-mod";
        context.worktreePath = "/tmp/wt";
      }
      sendInstructions(db, run.id, agent.id, role, context);

      const messages = getMessagesForAgent(db, agent.id);
      const msg = messages.find((m) => m.to_agent_id === agent.id);
      expect(msg).toBeDefined();
      expect(msg!.body).toContain("dark agent fail");
      expect(msg!.body).toContain(agent.id);
    }
  });

  test("builder instructions include TDD steps", () => {
    sendInstructions(db, runId, agentId, "builder", {
      moduleId: "test-mod",
      worktreePath: "/tmp/wt",
    });

    const messages = getMessagesForAgent(db, agentId);
    expect(messages[0].body).toContain("TDD");
  });

  test("architect instructions include holdout scenario creation", () => {
    sendInstructions(db, runId, agentId, "architect", {});

    const messages = getMessagesForAgent(db, agentId);
    expect(messages[0].body).toContain("dark scenario create");
    expect(messages[0].body).toContain("dark architect submit-plan");
  });

  test("builder instructions with no optional context still works", () => {
    sendInstructions(db, runId, agentId, "builder", {
      moduleId: "minimal-mod",
      worktreePath: "/tmp/minimal",
    });

    const messages = getMessagesForAgent(db, agentId);
    expect(messages.length).toBe(1);
    expect(messages[0].body).toContain("# Builder Instructions");
    expect(messages[0].body).toContain("minimal-mod");
  });

  test("merger instructions handle empty worktree paths", () => {
    sendInstructions(db, runId, agentId, "merger", {});

    const messages = getMessagesForAgent(db, agentId);
    expect(messages.length).toBe(1);
    expect(messages[0].body).toContain("# Merger Instructions");
    expect(messages[0].body).toContain("No worktrees specified");
  });
});

// ============================================================
// sendInstructions — file preloading integration
// ============================================================
describe("sendInstructions - file preloading", () => {
  const FIXTURE_DIR = join(import.meta.dir, "__fixtures__", "instructions-preload");

  beforeEach(() => {
    mkdirSync(join(FIXTURE_DIR, "src"), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(FIXTURE_DIR)) {
      rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }
  });

  test("builder instructions include pre-loaded file contents when scope.modifies has files", () => {
    writeFileSync(join(FIXTURE_DIR, "src/target.ts"), "export const x = 1;\nexport const y = 2;\n");

    sendInstructions(db, runId, agentId, "builder", {
      moduleId: "preload-mod",
      worktreePath: FIXTURE_DIR,
      scope: { creates: [], modifies: ["src/target.ts"], test_files: [] },
    });

    const messages = getMessagesForAgent(db, agentId);
    expect(messages.length).toBe(1);
    expect(messages[0].body).toContain("### Pre-loaded File: src/target.ts");
    expect(messages[0].body).toContain("export const x = 1;");
    expect(messages[0].body).toContain("export const y = 2;");
  });

  test("builder instructions include pre-loaded section header", () => {
    writeFileSync(join(FIXTURE_DIR, "src/target.ts"), "const a = 1;\n");

    sendInstructions(db, runId, agentId, "builder", {
      moduleId: "preload-mod",
      worktreePath: FIXTURE_DIR,
      scope: { creates: [], modifies: ["src/target.ts"], test_files: [] },
    });

    const messages = getMessagesForAgent(db, agentId);
    expect(messages[0].body).toContain("## Pre-loaded Files");
  });

  test("builder instructions with no modifies do not include pre-loaded section", () => {
    sendInstructions(db, runId, agentId, "builder", {
      moduleId: "no-preload",
      worktreePath: FIXTURE_DIR,
      scope: { creates: ["src/new.ts"], modifies: [], test_files: [] },
    });

    const messages = getMessagesForAgent(db, agentId);
    expect(messages[0].body).not.toContain("## Pre-loaded Files");
    expect(messages[0].body).not.toContain("### Pre-loaded File:");
  });

  test("builder instructions without scope do not include pre-loaded section", () => {
    sendInstructions(db, runId, agentId, "builder", {
      moduleId: "no-scope",
      worktreePath: FIXTURE_DIR,
    });

    const messages = getMessagesForAgent(db, agentId);
    expect(messages[0].body).not.toContain("## Pre-loaded Files");
  });

  test("pre-loaded section appears after scope and before TDD steps", () => {
    writeFileSync(join(FIXTURE_DIR, "src/target.ts"), "const a = 1;\n");

    sendInstructions(db, runId, agentId, "builder", {
      moduleId: "order-mod",
      worktreePath: FIXTURE_DIR,
      scope: { creates: [], modifies: ["src/target.ts"], test_files: [] },
    });

    const messages = getMessagesForAgent(db, agentId);
    const body = messages[0].body;

    const scopeIndex = body.indexOf("## Scope:");
    const preloadIndex = body.indexOf("## Pre-loaded Files");
    const stepsIndex = body.indexOf("## Steps");

    expect(scopeIndex).toBeGreaterThanOrEqual(0);
    expect(preloadIndex).toBeGreaterThan(scopeIndex);
    expect(stepsIndex).toBeGreaterThan(preloadIndex);
  });
});
