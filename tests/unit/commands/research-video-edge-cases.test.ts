/**
 * Edge case tests for the video research pipeline.
 *
 * Covers error handling, empty inputs, special characters,
 * and contract compliance for VideoResearchOptions and ResearchArtifactRecord.
 */
import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../src/db/index.js";
import type { SqliteDb } from "../../../src/db/index.js";
import { createRun } from "../../../src/db/queries/runs.js";
import { createAgent } from "../../../src/db/queries/agents.js";
import {
  listResearchArtifacts,
  getResearchArtifact,
} from "../../../src/db/queries/research.js";
import { executeVideoResearch } from "../../../src/commands/research/video-action.js";
import type { VideoResearchOptions } from "../../../src/types/index.js";
import type { ResearchArtifactRecord } from "../../../src/types/index.js";
import {
  buildVideoResearchLabel,
  buildTranscriptContent,
  buildQAContent,
} from "../../../src/commands/research/video-utils.js";
import { detectVideoUrls } from "../../../src/commands/research/video-detect.js";
import { extractVideoUrls } from "../../../src/utils/url-detection.js";

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

// =============================================================================
// Contract compliance: VideoResearchOptions
// =============================================================================

describe("VideoResearchOptions contract compliance", () => {
  test("VideoResearchOptions type is importable from types/index", () => {
    // This test verifies the contract is properly exported
    const options: VideoResearchOptions = {
      url: "https://www.youtube.com/watch?v=abc123",
    };
    expect(options.url).toBe("https://www.youtube.com/watch?v=abc123");
    expect(options.question).toBeUndefined();
    expect(options.module).toBeUndefined();
  });

  test("VideoResearchOptions accepts all optional fields", () => {
    const options: VideoResearchOptions = {
      url: "https://youtu.be/xyz",
      question: "What is this about?",
      module: "my-module",
      _transcriptFn: () => "transcript",
      _askFn: () => "answer",
      _infoFn: () => ({ title: "title", duration: "10:00" }),
    };
    expect(options.question).toBe("What is this about?");
    expect(options.module).toBe("my-module");
  });
});

// =============================================================================
// Contract compliance: ResearchArtifactRecord
// =============================================================================

describe("ResearchArtifactRecord contract compliance", () => {
  test("returned artifact has all required fields", () => {
    const result: ResearchArtifactRecord = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=test",
      _transcriptFn: () => "test transcript",
      _infoFn: () => null,
    });

    expect(result.id).toBeTruthy();
    expect(typeof result.id).toBe("string");
    expect(result.run_id).toBe(runId);
    expect(result.agent_id).toBe(agentId);
    expect(result.label).toBeTruthy();
    expect(result.type).toBe("text");
    expect(result.content).toBeTruthy();
    expect(result.created_at).toBeTruthy();
    // file_path should be null for text artifacts
    expect(result.file_path).toBeNull();
  });

  test("module_id is null when not provided", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=test",
      _transcriptFn: () => "transcript",
      _infoFn: () => null,
    });
    expect(result.module_id).toBeNull();
  });

  test("module_id is set when provided", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=test",
      module: "auth-module",
      _transcriptFn: () => "transcript",
      _infoFn: () => null,
    });
    expect(result.module_id).toBe("auth-module");
  });
});

// =============================================================================
// Error handling edge cases
// =============================================================================

describe("executeVideoResearch — error handling", () => {
  test("throws when agent does not exist", () => {
    expect(() =>
      executeVideoResearch(db, "agt_NONEXISTENT", {
        url: "https://www.youtube.com/watch?v=abc123",
        _transcriptFn: () => "transcript",
        _infoFn: () => null,
      })
    ).toThrow("Agent not found");
  });

  test("throws when transcript function fails", () => {
    expect(() =>
      executeVideoResearch(db, agentId, {
        url: "https://www.youtube.com/watch?v=abc123",
        _transcriptFn: () => {
          throw new Error("llm-youtube not found");
        },
        _infoFn: () => null,
      })
    ).toThrow("llm-youtube not found");
  });

  test("throws when ask function fails", () => {
    expect(() =>
      executeVideoResearch(db, agentId, {
        url: "https://www.youtube.com/watch?v=abc123",
        question: "What is this?",
        _askFn: () => {
          throw new Error("API rate limited");
        },
        _infoFn: () => null,
      })
    ).toThrow("API rate limited");
  });

  test("succeeds even when info function fails (info is optional)", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=abc123",
      _transcriptFn: () => "transcript works",
      _infoFn: () => {
        throw new Error("info failed");
      },
    });
    // Should still succeed — info is caught internally
    // Actually, _infoFn errors should be caught. Let's verify:
    // Looking at the code, _infoFn replaces runLlmYoutubeInfo which catches errors.
    // But when we pass _infoFn directly, it won't be caught unless the caller wraps it.
    // Let's test the actual behavior:
    expect(result.content).toContain("transcript works");
  });
});

// =============================================================================
// Special character handling
// =============================================================================

describe("special characters in video content", () => {
  test("handles special characters in transcript", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=abc123",
      _transcriptFn: () => 'Code example: const x = "hello"; // <tag> & stuff',
      _infoFn: () => null,
    });
    expect(result.content).toContain('const x = "hello"');
    expect(result.content).toContain("<tag>");
  });

  test("handles special characters in question", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=abc123",
      question: 'What does `const x = "test"` do?',
      _askFn: () => "It declares a variable.",
      _infoFn: () => null,
    });
    expect(result.content).toContain('`const x = "test"`');
  });

  test("handles unicode in video title", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=abc123",
      _transcriptFn: () => "transcript",
      _infoFn: () => ({ title: "日本語チュートリアル 🎬" }),
    });
    expect(result.label).toContain("日本語チュートリアル");
  });

  test("handles empty transcript", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=abc123",
      _transcriptFn: () => "",
      _infoFn: () => null,
    });
    expect(result.content).toContain("https://www.youtube.com/watch?v=abc123");
    expect(result.type).toBe("text");
  });

  test("handles empty answer", () => {
    const result = executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=abc123",
      question: "What is this?",
      _askFn: () => "",
      _infoFn: () => null,
    });
    expect(result.content).toContain("What is this?");
  });
});

// =============================================================================
// URL detection edge cases
// =============================================================================

describe("detectVideoUrls — edge cases", () => {
  test("handles URL at start of line", () => {
    const urls = detectVideoUrls("https://www.youtube.com/watch?v=abc123 is good");
    expect(urls).toHaveLength(1);
  });

  test("handles URL at end of line", () => {
    const urls = detectVideoUrls("See https://www.youtube.com/watch?v=abc123");
    expect(urls).toHaveLength(1);
  });

  test("handles URL in markdown link", () => {
    const urls = detectVideoUrls("[tutorial](https://www.youtube.com/watch?v=abc123)");
    expect(urls).toHaveLength(1);
  });

  test("handles empty string", () => {
    const urls = detectVideoUrls("");
    expect(urls).toHaveLength(0);
  });

  test("handles URL with hyphens in video ID", () => {
    const urls = detectVideoUrls("https://www.youtube.com/watch?v=abc-123_XYZ");
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("abc-123_XYZ");
  });
});

// =============================================================================
// extractVideoUrls (from url-detection.ts) edge cases
// =============================================================================

describe("extractVideoUrls — edge cases", () => {
  test("returns empty for null-like input", () => {
    expect(extractVideoUrls("")).toHaveLength(0);
  });

  test("handles YouTube embed URLs", () => {
    const urls = extractVideoUrls("https://www.youtube.com/embed/abc123");
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("embed/abc123");
  });

  test("handles URLs with trailing punctuation in markdown", () => {
    const urls = extractVideoUrls("See https://youtu.be/abc123.");
    expect(urls).toHaveLength(1);
  });

  test("handles multiple URLs on same line", () => {
    const urls = extractVideoUrls(
      "https://youtu.be/abc https://youtu.be/def"
    );
    expect(urls).toHaveLength(2);
  });
});

// =============================================================================
// Multiple artifacts in same run
// =============================================================================

describe("multiple video research artifacts", () => {
  test("multiple artifacts from same agent in same run are all retrievable", () => {
    executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=video1",
      _transcriptFn: () => "First transcript",
      _infoFn: () => ({ title: "Video 1" }),
    });

    executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=video2",
      question: "What is video 2 about?",
      _askFn: () => "It's about testing.",
      _infoFn: () => ({ title: "Video 2" }),
    });

    executeVideoResearch(db, agentId, {
      url: "https://www.loom.com/share/loom1",
      _transcriptFn: () => "Loom transcript",
      _infoFn: () => null,
    });

    const all = listResearchArtifacts(db, runId);
    expect(all).toHaveLength(3);

    // Verify each has unique ID
    const ids = new Set(all.map((a) => a.id));
    expect(ids.size).toBe(3);
  });

  test("module-tagged artifacts are filterable among mixed artifacts", () => {
    executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=tagged",
      module: "auth",
      _transcriptFn: () => "Auth transcript",
      _infoFn: () => null,
    });

    executeVideoResearch(db, agentId, {
      url: "https://www.youtube.com/watch?v=untagged",
      _transcriptFn: () => "Untagged transcript",
      _infoFn: () => null,
    });

    const authOnly = listResearchArtifacts(db, runId, { module_id: "auth" });
    expect(authOnly).toHaveLength(1);
    expect(authOnly[0].content).toContain("Auth transcript");

    const all = listResearchArtifacts(db, runId);
    expect(all).toHaveLength(2);
  });
});

// =============================================================================
// buildVideoResearchLabel edge cases
// =============================================================================

describe("buildVideoResearchLabel — edge cases", () => {
  test("handles very long title", () => {
    const longTitle = "A".repeat(500);
    const label = buildVideoResearchLabel("https://youtu.be/x", longTitle);
    expect(label).toContain(longTitle);
    expect(label).toStartWith("Video:");
  });

  test("handles empty string title (falls back to URL)", () => {
    const label = buildVideoResearchLabel("https://youtu.be/x", "");
    // Empty string is falsy, so should fall back to URL
    expect(label).toContain("https://youtu.be/x");
  });
});
