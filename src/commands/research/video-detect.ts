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
