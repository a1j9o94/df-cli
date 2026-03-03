/**
 * Detect YouTube and Loom video URLs in text content.
 *
 * Used by the architect instruction builder to identify
 * video references in spec content.
 */

/**
 * Regex patterns for detecting video URLs.
 * Matches:
 * - https://www.youtube.com/watch?v=...
 * - https://youtube.com/watch?v=...
 * - https://youtu.be/...
 * - https://www.loom.com/share/...
 * - http://loom.com/share/...
 */
const VIDEO_URL_PATTERN =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+|loom\.com\/share\/[\w-]+)/g;

/**
 * Extract all YouTube and Loom URLs from a text string.
 * Returns a deduplicated array of matched URLs.
 */
export function detectVideoUrls(text: string): string[] {
  const matches = text.match(VIDEO_URL_PATTERN);
  if (!matches) return [];
  // Deduplicate
  return [...new Set(matches)];
}

/**
 * Build a "Video References" section for architect instructions.
 *
 * When a spec contains YouTube/Loom URLs, this section is appended to the
 * architect's mail instructions, suggesting they use `dark research video`
 * to extract context before decomposing.
 *
 * Returns empty string if no URLs are provided (don't show empty sections).
 */
export function buildVideoReferencesSection(
  urls: string[],
  agentId: string
): string {
  if (urls.length === 0) return "";

  const urlList = urls
    .map((url) => `  - ${url}`)
    .join("\n");

  const commands = urls
    .map(
      (url) =>
        `  dark research video ${agentId} ${url}`
    )
    .join("\n");

  return [
    "",
    "## Video References",
    "",
    "The spec references these videos — use `dark research video` to extract context before decomposing:",
    "",
    urlList,
    "",
    "Suggested commands:",
    "",
    commands,
    "",
  ].join("\n");
}
