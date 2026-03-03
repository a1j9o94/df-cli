/**
 * Tests that architect instructions include video references when
 * the spec content contains YouTube/Loom URLs.
 */
import { describe, test, expect, beforeEach } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import { getMessagesForAgent } from "../../../src/db/queries/messages.js";
import { sendInstructions } from "../../../src/pipeline/instructions.js";

let db: SqliteDb;
let runId: string;
let agentId: string;
const tmpDir = join(import.meta.dir, "__tmp_arch_video_test__");

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

  // Setup temp dir for spec files
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });
});

describe("architect instructions with video URLs in spec", () => {
  test("includes Video References section when spec has YouTube URL", () => {
    const specPath = join(tmpDir, "spec-with-video.md");
    writeFileSync(
      specPath,
      `# My Feature\n\nSee the tutorial at https://www.youtube.com/watch?v=abc123 for implementation details.\n`
    );

    sendInstructions(db, runId, agentId, "architect", {
      specFilePath: specPath,
    });

    const messages = getMessagesForAgent(db, agentId);
    expect(messages).toHaveLength(1);
    const body = messages[0].body;

    // Must contain Video References section
    expect(body).toContain("Video References");
    expect(body).toContain("https://www.youtube.com/watch?v=abc123");
    expect(body).toContain("dark research video");
    expect(body).toContain(agentId);
  });

  test("includes multiple URLs when spec has YouTube and Loom", () => {
    const specPath = join(tmpDir, "spec-multi-video.md");
    writeFileSync(
      specPath,
      `# My Feature\n\nTutorial: https://www.youtube.com/watch?v=abc123\nWalkthrough: https://www.loom.com/share/xyz789\n`
    );

    sendInstructions(db, runId, agentId, "architect", {
      specFilePath: specPath,
    });

    const messages = getMessagesForAgent(db, agentId);
    const body = messages[0].body;

    expect(body).toContain("https://www.youtube.com/watch?v=abc123");
    expect(body).toContain("https://www.loom.com/share/xyz789");
  });

  test("does NOT include Video References section when spec has no video URLs", () => {
    const specPath = join(tmpDir, "spec-no-video.md");
    writeFileSync(
      specPath,
      `# My Feature\n\nJust a normal spec with no video links.\n`
    );

    sendInstructions(db, runId, agentId, "architect", {
      specFilePath: specPath,
    });

    const messages = getMessagesForAgent(db, agentId);
    const body = messages[0].body;

    expect(body).not.toContain("Video References");
  });
});
