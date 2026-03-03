import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import { createRun } from "../../../../src/db/queries/runs.js";
import { createAgent, updateAgentStatus } from "../../../../src/db/queries/agents.js";
import {
  getModuleAttemptCount,
  getModuleFailedAttempts,
  shouldRedecompose,
} from "../../../../src/db/queries/failure-tracking.js";
import type { SqliteDb } from "../../../../src/db/index.js";
import type { DfConfig } from "../../../../src/types/config.js";
import { DEFAULT_CONFIG } from "../../../../src/types/config.js";

let db: SqliteDb;
let runId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "spec_1" }).id;
});

describe("getModuleAttemptCount", () => {
  test("returns 0 when no agents exist for module", () => {
    const count = getModuleAttemptCount(db, runId, "mod-parser");
    expect(count).toBe(0);
  });

  test("returns 0 when agents exist but none are failed", () => {
    createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    const count = getModuleAttemptCount(db, runId, "mod-parser");
    expect(count).toBe(0);
  });

  test("counts failed builders for a module", () => {
    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a1.id, "failed", "timeout");

    const a2 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-2",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a2.id, "failed", "crash");

    const count = getModuleAttemptCount(db, runId, "mod-parser");
    expect(count).toBe(2);
  });

  test("counts incomplete builders as failed attempts", () => {
    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a1.id, "incomplete");

    const count = getModuleAttemptCount(db, runId, "mod-parser");
    expect(count).toBe(1);
  });

  test("does not count completed or running builders", () => {
    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a1.id, "completed");

    const a2 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-2",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a2.id, "running");

    const count = getModuleAttemptCount(db, runId, "mod-parser");
    expect(count).toBe(0);
  });

  test("only counts builders for the specified module", () => {
    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a1.id, "failed", "error");

    const a2 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-lexer-1",
      module_id: "mod-lexer",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a2.id, "failed", "error");

    expect(getModuleAttemptCount(db, runId, "mod-parser")).toBe(1);
    expect(getModuleAttemptCount(db, runId, "mod-lexer")).toBe(1);
  });

  test("only counts builders for the specified run", () => {
    const run2Id = createRun(db, { spec_id: "spec_2" }).id;

    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a1.id, "failed", "error");

    const a2 = createAgent(db, {
      agent_id: "",
      run_id: run2Id,
      role: "builder",
      name: "builder-parser-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a2.id, "failed", "error");

    expect(getModuleAttemptCount(db, runId, "mod-parser")).toBe(1);
    expect(getModuleAttemptCount(db, run2Id, "mod-parser")).toBe(1);
  });

  test("does not count non-builder agents", () => {
    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "architect",
      name: "architect-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a1.id, "failed", "error");

    expect(getModuleAttemptCount(db, runId, "mod-parser")).toBe(0);
  });
});

describe("getModuleFailedAttempts", () => {
  test("returns empty array when no failed agents", () => {
    const attempts = getModuleFailedAttempts(db, runId, "mod-parser");
    expect(attempts).toEqual([]);
  });

  test("returns failed agent records with error details", () => {
    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a1.id, "failed", "Module too complex");

    const attempts = getModuleFailedAttempts(db, runId, "mod-parser");
    expect(attempts).toHaveLength(1);
    expect(attempts[0].id).toBe(a1.id);
    expect(attempts[0].error).toBe("Module too complex");
    expect(attempts[0].status).toBe("failed");
  });

  test("returns attempts ordered by creation time (oldest first)", () => {
    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a1.id, "failed", "first error");

    const a2 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-2",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a2.id, "failed", "second error");

    const attempts = getModuleFailedAttempts(db, runId, "mod-parser");
    expect(attempts).toHaveLength(2);
    expect(attempts[0].error).toBe("first error");
    expect(attempts[1].error).toBe("second error");
  });

  test("includes incomplete builders", () => {
    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a1.id, "incomplete");

    const attempts = getModuleFailedAttempts(db, runId, "mod-parser");
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe("incomplete");
  });
});

describe("shouldRedecompose", () => {
  test("returns false when attempt count is below threshold", () => {
    const config: DfConfig = {
      ...DEFAULT_CONFIG,
      build: { ...DEFAULT_CONFIG.build, max_module_retries: 2 },
    };

    // One failed attempt - below threshold of 2
    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a1.id, "failed", "error");

    expect(shouldRedecompose(db, config, runId, "mod-parser")).toBe(false);
  });

  test("returns true when attempt count meets threshold", () => {
    const config: DfConfig = {
      ...DEFAULT_CONFIG,
      build: { ...DEFAULT_CONFIG.build, max_module_retries: 2 },
    };

    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a1.id, "failed", "error 1");

    const a2 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-2",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a2.id, "failed", "error 2");

    expect(shouldRedecompose(db, config, runId, "mod-parser")).toBe(true);
  });

  test("returns true when attempt count exceeds threshold", () => {
    const config: DfConfig = {
      ...DEFAULT_CONFIG,
      build: { ...DEFAULT_CONFIG.build, max_module_retries: 2 },
    };

    for (let i = 0; i < 3; i++) {
      const agent = createAgent(db, {
        agent_id: "",
        run_id: runId,
        role: "builder",
        name: `builder-parser-${i}`,
        module_id: "mod-parser",
        system_prompt: "prompt",
      });
      updateAgentStatus(db, agent.id, "failed", `error ${i}`);
    }

    expect(shouldRedecompose(db, config, runId, "mod-parser")).toBe(true);
  });

  test("uses default threshold of 2 when not configured", () => {
    const config = { ...DEFAULT_CONFIG };

    // One failure - should not trigger
    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a1.id, "failed", "error");

    expect(shouldRedecompose(db, config, runId, "mod-parser")).toBe(false);

    // Two failures - should trigger
    const a2 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-2",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a2.id, "failed", "error");

    expect(shouldRedecompose(db, config, runId, "mod-parser")).toBe(true);
  });

  test("respects custom threshold of 1", () => {
    const config: DfConfig = {
      ...DEFAULT_CONFIG,
      build: { ...DEFAULT_CONFIG.build, max_module_retries: 1 },
    };

    const a1 = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "builder-parser-1",
      module_id: "mod-parser",
      system_prompt: "prompt",
    });
    updateAgentStatus(db, a1.id, "failed", "error");

    expect(shouldRedecompose(db, config, runId, "mod-parser")).toBe(true);
  });

  test("returns false when no failures have occurred", () => {
    const config: DfConfig = {
      ...DEFAULT_CONFIG,
      build: { ...DEFAULT_CONFIG.build, max_module_retries: 2 },
    };

    expect(shouldRedecompose(db, config, runId, "mod-parser")).toBe(false);
  });
});
