import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import {
  createResearchArtifact,
  listResearchArtifacts,
  getResearchArtifact,
} from "../../../src/db/queries/research.js";
import {
  runLlmYoutubeTranscript,
  runLlmYoutubeAsk,
  runLlmYoutubeInfo,
  buildVideoResearchLabel,
  buildTranscriptContent,
  buildQAContent,
} from "../../../src/commands/research/video-utils.js";
import { detectVideoUrls } from "../../../src/commands/research/video-detect.js";

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

describe("buildVideoResearchLabel", () => {
  test("builds label from video title when available", () => {
    const label = buildVideoResearchLabel(
      "https://www.youtube.com/watch?v=abc123",
      "How to Build a REST API"
    );
    expect(label).toBe("Video: How to Build a REST API");
  });

  test("falls back to URL when no title provided", () => {
    const label = buildVideoResearchLabel(
      "https://www.youtube.com/watch?v=abc123"
    );
    expect(label).toContain("https://www.youtube.com/watch?v=abc123");
  });

  test("includes Q&A prefix when question is provided", () => {
    const label = buildVideoResearchLabel(
      "https://www.youtube.com/watch?v=abc123",
      "REST API Tutorial",
      "What library is used?"
    );
    expect(label).toContain("Q&A");
  });
});

describe("buildTranscriptContent", () => {
  test("wraps transcript in markdown with source URL", () => {
    const content = buildTranscriptContent(
      "https://www.youtube.com/watch?v=abc123",
      "Hello world this is a transcript"
    );
    expect(content).toContain("https://www.youtube.com/watch?v=abc123");
    expect(content).toContain("Hello world this is a transcript");
  });
});

describe("buildQAContent", () => {
  test("includes question, answer, and source URL", () => {
    const content = buildQAContent(
      "https://www.youtube.com/watch?v=abc123",
      "What library is used?",
      "The tutorial uses Express.js for the HTTP server."
    );
    expect(content).toContain("What library is used?");
    expect(content).toContain("The tutorial uses Express.js for the HTTP server.");
    expect(content).toContain("https://www.youtube.com/watch?v=abc123");
  });
});

describe("detectVideoUrls", () => {
  test("detects YouTube watch URLs", () => {
    const text = "Check out https://www.youtube.com/watch?v=abc123 for details";
    const urls = detectVideoUrls(text);
    expect(urls).toContain("https://www.youtube.com/watch?v=abc123");
  });

  test("detects YouTube short URLs", () => {
    const text = "See https://youtu.be/abc123 for the tutorial";
    const urls = detectVideoUrls(text);
    expect(urls).toContain("https://youtu.be/abc123");
  });

  test("detects Loom URLs", () => {
    const text = "Walkthrough at https://www.loom.com/share/abc123def456";
    const urls = detectVideoUrls(text);
    expect(urls).toContain("https://www.loom.com/share/abc123def456");
  });

  test("detects multiple URLs in one text", () => {
    const text = `
      See the tutorial at https://www.youtube.com/watch?v=abc123 for implementation details.
      Also review the walkthrough at https://www.loom.com/share/xyz789.
    `;
    const urls = detectVideoUrls(text);
    expect(urls).toHaveLength(2);
    expect(urls).toContain("https://www.youtube.com/watch?v=abc123");
    expect(urls).toContain("https://www.loom.com/share/xyz789");
  });

  test("returns empty array for text with no video URLs", () => {
    const text = "This is just normal text with https://example.com";
    const urls = detectVideoUrls(text);
    expect(urls).toHaveLength(0);
  });

  test("detects http (non-https) Loom URLs", () => {
    const text = "See http://loom.com/share/abc123";
    const urls = detectVideoUrls(text);
    expect(urls).toContain("http://loom.com/share/abc123");
  });

  test("detects YouTube URLs without www", () => {
    const text = "Watch https://youtube.com/watch?v=abc123";
    const urls = detectVideoUrls(text);
    expect(urls).toContain("https://youtube.com/watch?v=abc123");
  });

  test("does not duplicate URLs", () => {
    const text = `
      First mention: https://www.youtube.com/watch?v=abc123
      Second mention: https://www.youtube.com/watch?v=abc123
    `;
    const urls = detectVideoUrls(text);
    expect(urls).toHaveLength(1);
  });
});

describe("video research artifact integration", () => {
  test("transcript saved as research artifact is retrievable", () => {
    const content = buildTranscriptContent(
      "https://www.youtube.com/watch?v=abc123",
      "This is the full transcript of the video"
    );
    const label = buildVideoResearchLabel(
      "https://www.youtube.com/watch?v=abc123",
      "My Tutorial"
    );

    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label,
      type: "text",
      content,
      module_id: "my-module",
    });

    expect(artifact.id).toBeTruthy();
    expect(artifact.type).toBe("text");
    expect(artifact.module_id).toBe("my-module");

    // Verify it's queryable by module
    const list = listResearchArtifacts(db, runId, { module_id: "my-module" });
    expect(list).toHaveLength(1);
    expect(list[0].content).toContain("This is the full transcript of the video");
  });

  test("Q&A result saved as research artifact includes question and answer", () => {
    const content = buildQAContent(
      "https://www.youtube.com/watch?v=abc123",
      "What framework is used?",
      "The tutorial uses React with Next.js"
    );
    const label = buildVideoResearchLabel(
      "https://www.youtube.com/watch?v=abc123",
      "React Tutorial",
      "What framework is used?"
    );

    const artifact = createResearchArtifact(db, {
      run_id: runId,
      agent_id: agentId,
      label,
      type: "text",
      content,
    });

    const fetched = getResearchArtifact(db, artifact.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.content).toContain("What framework is used?");
    expect(fetched!.content).toContain("The tutorial uses React with Next.js");
    expect(fetched!.label).toContain("Q&A");
  });
});

describe("video command does not validate URLs", () => {
  test("any URL format is accepted (passthrough to llm-youtube)", () => {
    // The video command should NOT validate URLs.
    // It passes them directly to llm-youtube.
    // This is tested at the utility level by confirming
    // there's no URL validation function that rejects non-YouTube URLs.

    // buildTranscriptContent and buildVideoResearchLabel should work with any URL
    const label = buildVideoResearchLabel("https://example.com/podcast/ep1");
    expect(label).toContain("https://example.com/podcast/ep1");

    const content = buildTranscriptContent(
      "https://example.com/podcast/ep1",
      "Some transcript"
    );
    expect(content).toContain("https://example.com/podcast/ep1");
  });
});
