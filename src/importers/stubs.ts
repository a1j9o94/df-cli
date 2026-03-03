import type { IssueImporter, IssueData } from "./types.js";

/**
 * Creates a stub importer that can detect URLs from a particular service
 * but throws a "not yet implemented" error when fetch is called.
 * Used for --from-jira and --from-linear until real implementations exist.
 */
function createStubImporter(
  name: string,
  urlPattern: RegExp,
  helpText: string,
): IssueImporter {
  return {
    name,
    canHandle(url: string): boolean {
      return urlPattern.test(url);
    },
    async fetch(_url: string): Promise<IssueData> {
      throw new Error(
        `Not yet implemented: ${name} importer. ${helpText}`,
      );
    },
  };
}

/** Stub Jira importer — detects Jira URLs but throws on fetch */
export const jiraStubImporter = createStubImporter(
  "jira",
  /atlassian\.net\/browse\//,
  "See: dark spec create --from-github",
);

/** Stub Linear importer — detects Linear URLs but throws on fetch */
export const linearStubImporter = createStubImporter(
  "linear",
  /linear\.app\//,
  "See: dark spec create --from-github",
);
