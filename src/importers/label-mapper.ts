export interface LabelMapping {
  /** Mapped spec type (e.g., "bug", "feature") */
  type: string;
  /** Mapped spec priority (e.g., "critical", "high", "medium", "low") */
  priority: string;
  /** The original label that matched for type, undefined if default was used */
  typeSource?: string;
  /** The original label that matched for priority, undefined if default was used */
  prioritySource?: string;
}

const TYPE_MAP: Record<string, string> = {
  bug: "bug",
  bugfix: "bug",
  defect: "bug",
  enhancement: "feature",
  feature: "feature",
  "feature-request": "feature",
};

const PRIORITY_MAP: Record<string, string> = {
  p0: "critical",
  critical: "critical",
  urgent: "critical",
  p1: "high",
  high: "high",
  p2: "medium",
  medium: "medium",
  p3: "low",
  low: "low",
};

const DEFAULT_TYPE = "feature";
const DEFAULT_PRIORITY = "medium";

/**
 * Map issue tracker labels to spec type and priority.
 * Matching is case-insensitive. Unrecognized labels are ignored.
 * Returns defaults ("feature", "medium") when no matching labels found.
 */
export function mapLabels(labels: string[]): LabelMapping {
  let type: string | undefined;
  let priority: string | undefined;
  let typeSource: string | undefined;
  let prioritySource: string | undefined;

  for (const label of labels) {
    const lower = label.toLowerCase();

    if (!type && TYPE_MAP[lower]) {
      type = TYPE_MAP[lower];
      typeSource = lower;
    }

    if (!priority && PRIORITY_MAP[lower]) {
      priority = PRIORITY_MAP[lower];
      prioritySource = lower;
    }

    // Stop early if both are found
    if (type && priority) break;
  }

  return {
    type: type ?? DEFAULT_TYPE,
    priority: priority ?? DEFAULT_PRIORITY,
    typeSource,
    prioritySource,
  };
}
