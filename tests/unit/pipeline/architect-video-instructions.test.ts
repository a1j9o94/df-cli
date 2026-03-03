<<<<<<< HEAD
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
=======
import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import { createSpec } from "../../../src/db/queries/specs.js";
import { createMessage, getMessagesForAgent } from "../../../src/db/queries/messages.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { sendInstructions } from "../../../src/pipeline/instructions.js";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

// =============================================================================
// Architect instructions: video URL auto-detection in spec content
// =============================================================================

describe("sendInstructions — architect video URL detection", () => {
  test("architect instructions include video URLs found in spec content", () => {
    // Create a temporary spec file with a YouTube URL
    const tmpDir = join(process.cwd(), ".df", "specs");
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    const specFilePath = join(tmpDir, "spec_video_test.md");
    writeFileSync(specFilePath, `# Test Spec\n\nSee https://www.youtube.com/watch?v=abc123 for the tutorial.`);

    try {
      const spec = createSpec(db, "spec_video_test", "Video Test Spec", specFilePath);
      const run = createRun(db, { spec_id: spec.id });
      const agent = createAgent(db, {
        agent_id: "",
        run_id: run.id,
        role: "architect",
        name: "arch-video-test",
        system_prompt: "arch",
      });

      sendInstructions(db, run.id, agent.id, "architect", {
        specFilePath,
      });

      const messages = getMessagesForAgent(db, agent.id);
      expect(messages.length).toBeGreaterThan(0);
      const body = messages[0].body;

      // The instruction body should mention the YouTube URL
      expect(body).toContain("https://www.youtube.com/watch?v=abc123");
      // And suggest using dark research video
      expect(body).toContain("dark research video");
    } finally {
      // Cleanup temp file
      if (existsSync(specFilePath)) rmSync(specFilePath);
    }
  });

  test("architect instructions include Loom URLs found in spec content", () => {
    const tmpDir = join(process.cwd(), ".df", "specs");
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    const specFilePath = join(tmpDir, "spec_loom_test.md");
    writeFileSync(specFilePath, `# Test Spec\n\nSee the walkthrough: https://www.loom.com/share/def456`);

    try {
      const spec = createSpec(db, "spec_loom_test", "Loom Test Spec", specFilePath);
      const run = createRun(db, { spec_id: spec.id });
      const agent = createAgent(db, {
        agent_id: "",
        run_id: run.id,
        role: "architect",
        name: "arch-loom-test",
        system_prompt: "arch",
      });

      sendInstructions(db, run.id, agent.id, "architect", {
        specFilePath,
      });

      const messages = getMessagesForAgent(db, agent.id);
      const body = messages[0].body;

      expect(body).toContain("https://www.loom.com/share/def456");
      expect(body).toContain("dark research video");
    } finally {
      if (existsSync(specFilePath)) rmSync(specFilePath);
    }
  });

  test("architect instructions include multiple video URLs", () => {
    const tmpDir = join(process.cwd(), ".df", "specs");
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    const specFilePath = join(tmpDir, "spec_multi_video.md");
    writeFileSync(specFilePath, `# Spec\n\nSee https://youtu.be/vid1 and https://www.loom.com/share/loom1`);

    try {
      const spec = createSpec(db, "spec_multi_video", "Multi Video Spec", specFilePath);
      const run = createRun(db, { spec_id: spec.id });
      const agent = createAgent(db, {
        agent_id: "",
        run_id: run.id,
        role: "architect",
        name: "arch-multi-video",
        system_prompt: "arch",
      });

      sendInstructions(db, run.id, agent.id, "architect", {
        specFilePath,
      });

      const messages = getMessagesForAgent(db, agent.id);
      const body = messages[0].body;

      expect(body).toContain("https://youtu.be/vid1");
      expect(body).toContain("https://www.loom.com/share/loom1");
    } finally {
      if (existsSync(specFilePath)) rmSync(specFilePath);
    }
  });

  test("architect instructions have no video section when spec has no video URLs", () => {
    const tmpDir = join(process.cwd(), ".df", "specs");
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    const specFilePath = join(tmpDir, "spec_no_video.md");
    writeFileSync(specFilePath, `# Spec\n\nNo videos here. Just text and https://github.com/repo.`);

    try {
      const spec = createSpec(db, "spec_no_video", "No Video Spec", specFilePath);
      const run = createRun(db, { spec_id: spec.id });
      const agent = createAgent(db, {
        agent_id: "",
        run_id: run.id,
        role: "architect",
        name: "arch-no-video",
        system_prompt: "arch",
      });

      sendInstructions(db, run.id, agent.id, "architect", {
        specFilePath,
      });

      const messages = getMessagesForAgent(db, agent.id);
      const body = messages[0].body;

      // Should NOT have a referenced videos section
      expect(body).not.toMatch(/Referenced Video/i);
    } finally {
      if (existsSync(specFilePath)) rmSync(specFilePath);
    }
  });

  test("architect instructions still work when spec file cannot be read", () => {
    const spec = createSpec(db, "spec_missing_file", "Missing File Spec", "/nonexistent/path/spec.md");
    const run = createRun(db, { spec_id: spec.id });
    const agent = createAgent(db, {
      agent_id: "",
      run_id: run.id,
      role: "architect",
      name: "arch-missing-file",
      system_prompt: "arch",
    });

    // Should not throw — gracefully handles missing file
    sendInstructions(db, run.id, agent.id, "architect", {
      specFilePath: "/nonexistent/path/spec.md",
    });

    const messages = getMessagesForAgent(db, agent.id);
    expect(messages.length).toBeGreaterThan(0);
    // Should not have a video URL section since file couldn't be read
    expect(messages[0].body).not.toMatch(/Referenced Video/i);
>>>>>>> df-build/run_01KJ/architect-video-integration-mmapgpf4
  });
});
