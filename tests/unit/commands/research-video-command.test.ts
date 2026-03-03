/**
 * Tests for the `dark research video` CLI command.
 *
 * These tests mock the llm-youtube subprocess calls to avoid
 * needing the actual tool installed or network access.
 */
import { describe, test, expect, beforeEach, mock } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import {
  listResearchArtifacts,
  getResearchArtifact,
} from "../../../src/db/queries/research.js";
import {
  executeVideoResearch,
  type VideoResearchOptions,
} from "../../../src/commands/research/video-action.js";

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

describe("executeVideoResearch — transcript mode", () => {
  test("saves transcript as research artifact", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=abc123",
      // Mock the llm-youtube calls
      _transcriptFn: () => "This is the transcript of the video about REST APIs.",
      _infoFn: () => ({ title: "REST API Tutorial" }),
    });

    expect(result.id).toBeTruthy();
    expect(result.type).toBe("text");
    expect(result.label).toBe("Video: REST API Tutorial");
    expect(result.content).toContain("This is the transcript of the video about REST APIs.");
    expect(result.content).toContain("https://www.youtube.com/watch?v=abc123");
  });

  test("falls back to URL in label when info fails", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=abc123",
      _transcriptFn: () => "Some transcript text",
      _infoFn: () => null,
    });

    expect(result.label).toContain("https://www.youtube.com/watch?v=abc123");
  });

  test("artifact is retrievable via list and show", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=abc123",
      _transcriptFn: () => "Transcript text",
      _infoFn: () => null,
    });

    const list = listResearchArtifacts(db, runId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(result.id);

    const shown = getResearchArtifact(db, result.id);
    expect(shown).not.toBeNull();
    expect(shown!.content).toContain("Transcript text");
  });
});

describe("executeVideoResearch — Q&A mode", () => {
  test("saves Q&A result as research artifact when question provided", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=abc123",
      question: "What library is used for auth?",
      _askFn: () => "The tutorial uses Passport.js for authentication.",
      _infoFn: () => ({ title: "Auth Tutorial" }),
    });

    expect(result.label).toContain("Q&A");
    expect(result.label).toContain("Auth Tutorial");
    expect(result.content).toContain("What library is used for auth?");
    expect(result.content).toContain("The tutorial uses Passport.js for authentication.");
    expect(result.content).toContain("https://www.youtube.com/watch?v=abc123");
  });

  test("Q&A mode does not also fetch transcript", () => {
    let transcriptCalled = false;
    executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=abc123",
      question: "What is this about?",
      _askFn: () => "It's about testing.",
      _transcriptFn: () => {
        transcriptCalled = true;
        return "should not be called";
      },
      _infoFn: () => null,
    });

    expect(transcriptCalled).toBe(false);
  });
});

describe("executeVideoResearch — module tagging", () => {
  test("tags artifact with module when --module provided", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=abc123",
      module: "my-module",
      _transcriptFn: () => "Transcript",
      _infoFn: () => null,
    });

    expect(result.module_id).toBe("my-module");

    // Verify filtering works
    const filtered = listResearchArtifacts(db, runId, { module_id: "my-module" });
    expect(filtered).toHaveLength(1);

    const otherModule = listResearchArtifacts(db, runId, { module_id: "other-module" });
    expect(otherModule).toHaveLength(0);
  });
});

describe("executeVideoResearch — Loom support", () => {
  test("accepts Loom URLs without rejection", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.loom.com/share/abc123def456",
      _transcriptFn: () => "Loom walkthrough transcript",
      _infoFn: () => ({ title: "Loom Walkthrough" }),
    });

    expect(result.content).toContain("Loom walkthrough transcript");
    expect(result.content).toContain("https://www.loom.com/share/abc123def456");
    expect(result.label).toBe("Video: Loom Walkthrough");
  });

  test("Loom URL with Q&A mode", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.loom.com/share/abc123def456",
      question: "What does this walkthrough demonstrate?",
      _askFn: () => "It demonstrates the new onboarding flow.",
      _infoFn: () => null,
    });

    expect(result.content).toContain("What does this walkthrough demonstrate?");
    expect(result.content).toContain("It demonstrates the new onboarding flow.");
  });
});

describe("executeVideoResearch — passthrough (no URL validation)", () => {
  test("any URL is accepted (passthrough to llm-youtube)", () => {
    // This validates the changeability scenario: podcast support
    const result = executeVideoResearch(db, agentId, {
      url: "https://example.com/podcast/ep1",
      _transcriptFn: () => "Podcast transcript",
      _infoFn: () => null,
    });

    expect(result.content).toContain("Podcast transcript");
    expect(result.content).toContain("https://example.com/podcast/ep1");
  });
});
