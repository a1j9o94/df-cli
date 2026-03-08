import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import type { SqliteDb } from "../../../../src/db/index.js";
import { createRun } from "../../../../src/db/queries/runs.js";
import { createAgent } from "../../../../src/db/queries/agents.js";
import {
  createResearchArtifact,
  getResearchArtifact,
  listResearchArtifacts,
  deleteResearchArtifact,
} from "../../../../src/db/queries/research.js";

let db: SqliteDb;
let runId: string;
let agentId: string;

beforeEach(() => {
  db = getDbForTest();
  runId = createRun(db, { spec_id: "s1" }).id;
  const agent = createAgent(db, {
    agent_id: "",
    run_id: runId,
    role: "architect",
    name: "test-architect",
    system_prompt: "test",
  });
  agentId = agent.id;
});

describe("research artifact edge cases", () => {
  test("handles very long content strings", () => {
    const longContent = "x".repeat(100_000);
    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Long content",
      type: "text",
      content: longContent,
    });

    const fetched = getResearchArtifact(db, artifact.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.content).toHaveLength(100_000);
  });

  test("handles special characters in label and content", () => {
    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: 'Label with "quotes" & <html> chars',
      type: "text",
      content: "Content with\nnewlines\tand\ttabs\nand unicode: 日本語 🎯",
    });

    const fetched = getResearchArtifact(db, artifact.id);
    expect(fetched!.label).toBe('Label with "quotes" & <html> chars');
    expect(fetched!.content).toContain("日本語 🎯");
    expect(fetched!.content).toContain("\n");
    expect(fetched!.content).toContain("\t");
  });

  test("handles empty string content (not null)", () => {
    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Empty content",
      type: "text",
      content: "",
    });

    const fetched = getResearchArtifact(db, artifact.id);
    expect(fetched!.content).toBe("");
  });

  test("content defaults to null when not provided", () => {
    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "File only",
      type: "file",
      file_path: "/tmp/test.png",
    });

    const fetched = getResearchArtifact(db, artifact.id);
    expect(fetched!.content).toBeNull();
  });

  test("combined filtering by module_id and agent_id", () => {
    const builder = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "builder",
      name: "test-builder",
      system_prompt: "test",
    });

    // Architect saves to payments module
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Architect payment research",
      type: "text",
      content: "a",
      module_id: "payments",
    });

    // Builder saves to payments module
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: builder.id,
      label: "Builder payment research",
      type: "text",
      content: "b",
      module_id: "payments",
    });

    // Builder saves to auth module
    createResearchArtifact(db, {
      run_id: runId,
      agent_id: builder.id,
      label: "Builder auth research",
      type: "text",
      content: "c",
      module_id: "auth",
    });

    // Filter by both module and agent
    const results = listResearchArtifacts(db, runId, {
      module_id: "payments",
      agent_id: builder.id,
    });
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe("Builder payment research");
  });

  test("artifacts from different runs are isolated", () => {
    const run2Id = createRun(db, { spec_id: "s2" }).id;
    const agent2 = createAgent(db, {
      agent_id: "",
      run_id: run2Id,
      role: "architect",
      name: "test-architect-2",
      system_prompt: "test",
    });

    createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Run 1 finding",
      type: "text",
      content: "from run 1",
    });

    createResearchArtifact(db, {
      run_id: run2Id,
      agent_id: agent2.id,
      label: "Run 2 finding",
      type: "text",
      content: "from run 2",
    });

    const run1List = listResearchArtifacts(db, runId);
    expect(run1List).toHaveLength(1);
    expect(run1List[0].label).toBe("Run 1 finding");

    const run2List = listResearchArtifacts(db, run2Id);
    expect(run2List).toHaveLength(1);
    expect(run2List[0].label).toBe("Run 2 finding");
  });
});

describe("deleteResearchArtifact", () => {
  test("deletes an existing artifact and returns true", () => {
    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "To be deleted",
      type: "text",
      content: "temporary",
    });

    const deleted = deleteResearchArtifact(db, artifact.id);
    expect(deleted).toBe(true);

    const fetched = getResearchArtifact(db, artifact.id);
    expect(fetched).toBeNull();
  });

  test("returns false for non-existent artifact", () => {
    const deleted = deleteResearchArtifact(db, "rsch_NONEXISTENT");
    expect(deleted).toBe(false);
  });

  test("does not affect other artifacts when deleting one", () => {
    const a1 = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Keep this",
      type: "text",
      content: "stays",
    });

    const a2 = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label: "Delete this",
      type: "text",
      content: "goes away",
    });

    deleteResearchArtifact(db, a2.id);

    const list = listResearchArtifacts(db, runId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(a1.id);
  });
});
