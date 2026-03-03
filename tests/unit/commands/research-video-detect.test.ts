/**
 * Tests for URL auto-detection in spec content and
 * the video references section builder for architect instructions.
 */
import { describe, test, expect } from "bun:test";
import { detectVideoUrls } from "../../../src/commands/research/video-detect.js";
import { buildVideoReferencesSection } from "../../../src/commands/research/video-detect.js";

describe("detectVideoUrls — comprehensive patterns", () => {
  test("detects standard YouTube watch URL", () => {
    const urls = detectVideoUrls("See https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(urls).toEqual(["https://www.youtube.com/watch?v=dQw4w9WgXcQ"]);
  });

  test("detects YouTube without www", () => {
    const urls = detectVideoUrls("Watch https://youtube.com/watch?v=abc123");
    expect(urls).toEqual(["https://youtube.com/watch?v=abc123"]);
  });

  test("detects YouTube short URL", () => {
    const urls = detectVideoUrls("Link: https://youtu.be/abc123");
    expect(urls).toEqual(["https://youtu.be/abc123"]);
  });

  test("detects Loom share URL with www", () => {
    const urls = detectVideoUrls("See https://www.loom.com/share/abc123");
    expect(urls).toEqual(["https://www.loom.com/share/abc123"]);
  });

  test("detects Loom share URL without www", () => {
    const urls = detectVideoUrls("See http://loom.com/share/abc123");
    expect(urls).toEqual(["http://loom.com/share/abc123"]);
  });

  test("detects multiple mixed URLs", () => {
    const text = `
# My Spec

See the tutorial at https://www.youtube.com/watch?v=abc123 for implementation details.
Also review the walkthrough at https://www.loom.com/share/xyz789.
And this short link: https://youtu.be/def456
    `;
    const urls = detectVideoUrls(text);
    expect(urls).toHaveLength(3);
    expect(urls).toContain("https://www.youtube.com/watch?v=abc123");
    expect(urls).toContain("https://www.loom.com/share/xyz789");
    expect(urls).toContain("https://youtu.be/def456");
  });

  test("returns empty for text without video URLs", () => {
    const urls = detectVideoUrls("Just a normal spec with https://github.com/repo links");
    expect(urls).toHaveLength(0);
  });

  test("deduplicates repeated URLs", () => {
    const text = `
First: https://www.youtube.com/watch?v=abc123
Again: https://www.youtube.com/watch?v=abc123
    `;
    const urls = detectVideoUrls(text);
    expect(urls).toHaveLength(1);
  });
});

describe("buildVideoReferencesSection", () => {
  test("builds a section with detected URLs and dark research video suggestion", () => {
    const urls = [
      "https://www.youtube.com/watch?v=abc123",
      "https://www.loom.com/share/xyz789",
    ];
    const section = buildVideoReferencesSection(urls, "agt_TEST123");

    // Must contain the URLs
    expect(section).toContain("https://www.youtube.com/watch?v=abc123");
    expect(section).toContain("https://www.loom.com/share/xyz789");

    // Must suggest dark research video
    expect(section).toContain("dark research video");

    // Must include the agent ID
    expect(section).toContain("agt_TEST123");
  });

  test("returns empty string when no URLs", () => {
    const section = buildVideoReferencesSection([], "agt_TEST123");
    expect(section).toBe("");
  });

  test("includes header/title for the section", () => {
    const section = buildVideoReferencesSection(
      ["https://www.youtube.com/watch?v=abc123"],
      "agt_TEST123"
    );
    expect(section).toContain("Video References");
  });
});
