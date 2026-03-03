/**
 * URL detection utilities for extracting video URLs from text content.
 *
 * Detects YouTube (youtube.com, youtu.be) and Loom (loom.com) URLs
 * in spec bodies and other text, used by the architect prompt to
 * call out referenced videos.
 */

/**
 * Extract YouTube and Loom video URLs from text content.
 *
 * Matches:
 * - https://www.youtube.com/watch?v=...
 * - https://youtube.com/watch?v=...
 * - https://youtu.be/...
 * - https://www.youtube.com/embed/...
 * - https://www.loom.com/share/...
 * - https://loom.com/share/...
 *
 * Also matches http:// variants.
 *
 * @param text - The text content to scan for video URLs
 * @returns Array of unique video URLs found in the text
 */
export function extractVideoUrls(text: string): string[] {
  if (!text) return [];

  // Match YouTube and Loom URLs
  // The regex captures URLs that start with http(s)://
  // and belong to youtube.com, youtu.be, or loom.com domains
  const urlPattern =
    /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?[^\s)]+|embed\/[^\s)]+)|youtu\.be\/[^\s)]+|loom\.com\/share\/[^\s)]+)/g;

  const matches = text.match(urlPattern);
  if (!matches) return [];

  // Deduplicate
  return [...new Set(matches)];
}
