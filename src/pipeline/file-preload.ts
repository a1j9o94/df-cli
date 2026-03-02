/**
 * Pre-load file contents for builder instructions.
 *
 * When a module's scope includes files to modify, this module reads those
 * files and prepares their content for inclusion in the builder's mail.
 * This prevents builders from wasting context window turns reading files.
 *
 * Contract: file-preload-excerpt-format
 * - Files <= 200 lines: full content included
 * - Files > 200 lines: first 100 + last 100 lines with omission markers
 * - Multiple files: one section per file, in scope.modifies order
 * - Wrapped in triple-backtick code fence with language identifier
 */

import { readFileSync } from "node:fs";
import { extname, join } from "node:path";

/** The maximum number of lines before we truncate */
const MAX_FULL_LINES = 200;

/** Number of lines to include from the start of a large file */
const HEAD_LINES = 100;

/** Number of lines to include from the end of a large file */
const TAIL_LINES = 100;

export interface FilePreloadResult {
  /** Relative path within the project */
  path: string;
  /** File content (full or excerpt) */
  content: string;
  /** Whether the content was truncated */
  truncated: boolean;
  /** Error message if the file couldn't be read */
  error?: string;
}

export interface ModuleScope {
  creates: string[];
  modifies: string[];
  test_files: string[];
}

/**
 * Read files listed in scope.modifies and return their contents.
 *
 * For files <= 200 lines, the full content is returned.
 * For files > 200 lines, the first 100 and last 100 lines are included
 * with an omission marker in between.
 *
 * @param scope - The module scope from the buildplan
 * @param projectRoot - The root directory to resolve relative paths against
 * @returns Array of file preload results, one per file in scope.modifies
 */
export function extractFileContents(scope: ModuleScope, projectRoot: string): FilePreloadResult[] {
  if (!scope.modifies || scope.modifies.length === 0) {
    return [];
  }

  return scope.modifies.map((relativePath) => {
    const fullPath = join(projectRoot, relativePath);

    try {
      const rawContent = readFileSync(fullPath, "utf-8");
      const lines = rawContent.split("\n");

      if (lines.length <= MAX_FULL_LINES) {
        return {
          path: relativePath,
          content: rawContent,
          truncated: false,
        };
      }

      // Truncate: first HEAD_LINES + omission marker + last TAIL_LINES
      const headSection = lines.slice(0, HEAD_LINES);
      const tailSection = lines.slice(-TAIL_LINES);
      const omittedStart = HEAD_LINES + 1;
      const omittedEnd = lines.length - TAIL_LINES;

      const excerptContent = [
        ...headSection,
        `// ... (lines ${omittedStart}-${omittedEnd} omitted)`,
        ...tailSection,
      ].join("\n");

      return {
        path: relativePath,
        content: excerptContent,
        truncated: true,
      };
    } catch (err) {
      return {
        path: relativePath,
        content: "",
        truncated: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
}

/**
 * Detect the language identifier for a code fence based on file extension.
 */
function getLanguageId(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const langMap: Record<string, string> = {
    ".ts": "ts",
    ".tsx": "tsx",
    ".js": "js",
    ".jsx": "jsx",
    ".py": "py",
    ".go": "go",
    ".rs": "rs",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json",
    ".md": "md",
    ".sql": "sql",
    ".sh": "sh",
    ".bash": "bash",
    ".css": "css",
    ".html": "html",
  };
  return langMap[ext] || "";
}

/**
 * Format pre-loaded file contents into markdown sections for builder mail.
 *
 * Follows the file-preload-excerpt-format contract:
 * ```
 * ### Pre-loaded File: path/to/file.ts
 * ```ts
 * <file contents or excerpt>
 * ```
 * ```
 *
 * @param files - Array of file preload results from extractFileContents
 * @returns Markdown string with all pre-loaded file sections
 */
export function formatPreloadedFiles(files: FilePreloadResult[]): string {
  if (files.length === 0) {
    return "";
  }

  const sections = files.map((file) => {
    const lang = getLanguageId(file.path);
    const header = `### Pre-loaded File: ${file.path}`;

    if (file.error) {
      return [header, `(Error reading file: ${file.error})`].join("\n");
    }

    const truncationNotice = file.truncated
      ? " (truncated — file exceeds 200 lines, showing first 100 + last 100)"
      : "";

    return [`${header}${truncationNotice}`, `\`\`\`${lang}`, file.content, "```"].join("\n");
  });

  return sections.join("\n\n");
}
