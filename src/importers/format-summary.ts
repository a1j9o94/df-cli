import type { ImportSpecResult } from "./import-spec.js";

/**
 * Format the import result as a human-readable summary for CLI output.
 *
 * Example output:
 * ```
 * Created spec: .df/specs/spec_01KJP....md
 * Title: Fix authentication redirect loop
 * Type: bug (from label: bug)
 * Priority: high (from label: p1)
 * Source: https://github.com/org/repo/issues/123
 * Requirements: 4 extracted
 * Scenarios: 2 extracted from acceptance criteria
 *
 * Review and edit: dark spec edit spec_01KJP...
 * Build when ready: dark build spec_01KJP...
 * ```
 */
export function formatImportSummary(result: ImportSpecResult): string {
  const typeLabel = result.typeSource
    ? `(from label: ${result.typeSource})`
    : "(default)";
  const priorityLabel = result.prioritySource
    ? `(from label: ${result.prioritySource})`
    : "(default)";

  const lines = [
    `Created spec: ${result.filePath}`,
    `Title: ${result.title}`,
    `Type: ${result.type} ${typeLabel}`,
    `Priority: ${result.priority} ${priorityLabel}`,
    `Source: ${result.sourceUrl}`,
    `Requirements: ${result.requirementsCount} extracted`,
    `Scenarios: ${result.scenariosCount} extracted from acceptance criteria`,
    "",
    `Review and edit: dark spec edit ${result.specId}`,
    `Build when ready: dark build ${result.specId}`,
  ];

  return lines.join("\n");
}
