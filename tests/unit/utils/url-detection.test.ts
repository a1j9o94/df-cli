import { describe, test, expect } from "bun:test";
import { extractVideoUrls } from "../../../src/utils/url-detection.js";

// =============================================================================
// extractVideoUrls — detects YouTube and Loom URLs in text content
// =============================================================================

describe("extractVideoUrls", () => {
  // --- YouTube URLs ---

  test("detects standard youtube.com watch URLs", () => {
    const text = "Check this tutorial: https://www.youtube.com/watch?v=dQw4w9WgXcQ for reference.";
    const urls = extractVideoUrls(text);
    expect(urls).toEqual(["https://www.youtube.com/watch?v=dQw4w9WgXcQ"]);
  });

  test("detects youtu.be short URLs", () => {
    const text = "See https://youtu.be/dQw4w9WgXcQ for details.";
    const urls = extractVideoUrls(text);
    expect(urls).toEqual(["https://youtu.be/dQw4w9WgXcQ"]);
  });

  test("detects youtube.com URLs without www", () => {
    const text = "Watch https://youtube.com/watch?v=abc123 now.";
    const urls = extractVideoUrls(text);
    expect(urls).toEqual(["https://youtube.com/watch?v=abc123"]);
  });

  test("detects youtube.com embed URLs", () => {
    const text = "Embed: https://www.youtube.com/embed/abc123";
    const urls = extractVideoUrls(text);
    expect(urls).toEqual(["https://www.youtube.com/embed/abc123"]);
  });

  test("detects youtube.com URLs with additional query params", () => {
    const text = "Link: https://www.youtube.com/watch?v=abc123&t=120s";
    const urls = extractVideoUrls(text);
    expect(urls).toEqual(["https://www.youtube.com/watch?v=abc123&t=120s"]);
  });

  // --- Loom URLs ---

  test("detects loom.com share URLs", () => {
    const text = "See the walkthrough: https://www.loom.com/share/abc123def456";
    const urls = extractVideoUrls(text);
    expect(urls).toEqual(["https://www.loom.com/share/abc123def456"]);
  });

  test("detects loom.com URLs without www", () => {
    const text = "Watch https://loom.com/share/abc123def456 for context.";
    const urls = extractVideoUrls(text);
    expect(urls).toEqual(["https://loom.com/share/abc123def456"]);
  });

  // --- Multiple URLs ---

  test("detects multiple video URLs in one text", () => {
    const text = `
# Spec

See this tutorial: https://www.youtube.com/watch?v=video1
And this walkthrough: https://www.loom.com/share/loom123
Also this short link: https://youtu.be/short1
    `;
    const urls = extractVideoUrls(text);
    expect(urls).toHaveLength(3);
    expect(urls).toContain("https://www.youtube.com/watch?v=video1");
    expect(urls).toContain("https://www.loom.com/share/loom123");
    expect(urls).toContain("https://youtu.be/short1");
  });

  // --- Deduplication ---

  test("deduplicates repeated URLs", () => {
    const text = `
See https://youtu.be/abc123 for part 1.
And again https://youtu.be/abc123 for reference.
    `;
    const urls = extractVideoUrls(text);
    expect(urls).toEqual(["https://youtu.be/abc123"]);
  });

  // --- Non-video URLs ---

  test("returns empty array when no video URLs present", () => {
    const text = "Check https://example.com and https://github.com/repo for details.";
    const urls = extractVideoUrls(text);
    expect(urls).toEqual([]);
  });

  test("does not match non-video URLs from youtube-like domains", () => {
    const text = "See https://notyoutube.com/watch?v=fake for details.";
    const urls = extractVideoUrls(text);
    expect(urls).toEqual([]);
  });

  // --- Edge cases ---

  test("returns empty array for empty string", () => {
    const urls = extractVideoUrls("");
    expect(urls).toEqual([]);
  });

  test("handles URLs at start and end of text without extra spaces", () => {
    const text = "https://youtu.be/abc123";
    const urls = extractVideoUrls(text);
    expect(urls).toEqual(["https://youtu.be/abc123"]);
  });

  test("handles URLs inside markdown links", () => {
    const text = "See [this video](https://www.youtube.com/watch?v=abc123) for details.";
    const urls = extractVideoUrls(text);
    expect(urls).toEqual(["https://www.youtube.com/watch?v=abc123"]);
  });

  test("handles http:// URLs (not just https://)", () => {
    const text = "Watch http://www.youtube.com/watch?v=abc123 here.";
    const urls = extractVideoUrls(text);
    expect(urls).toEqual(["http://www.youtube.com/watch?v=abc123"]);
  });
});
