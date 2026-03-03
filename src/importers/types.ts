/**
 * Represents a comment on an issue from an external tracker.
 */
export interface Comment {
  /** The username/handle of the comment author */
  author: string;
  /** ISO 8601 date string of when the comment was posted */
  date: string;
  /** The comment body text */
  body: string;
  /** Whether this comment was posted by a bot account */
  isBot: boolean;
}

/**
 * Normalized issue data extracted from an external issue tracker.
 * This is the common data model that all importers produce.
 */
export interface IssueData {
  /** Issue title */
  title: string;
  /** Issue body/description (may contain markdown) */
  body: string;
  /** Labels attached to the issue */
  labels: string[];
  /** Comments on the issue */
  comments: Comment[];
  /** Original URL of the issue in the external tracker */
  sourceUrl: string;
}

/**
 * Interface that all issue importers must implement.
 * Each importer handles a specific issue tracker (GitHub, Jira, Linear, etc.)
 */
export interface IssueImporter {
  /** Human-readable name for this importer (e.g., "github", "jira") */
  name: string;
  /** Returns true if this importer can handle the given URL */
  canHandle(url: string): boolean;
  /** Fetches issue data from the given URL */
  fetch(url: string): Promise<IssueData>;
}
