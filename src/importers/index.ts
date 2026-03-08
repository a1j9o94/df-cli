export type { IssueData, Comment, IssueImporter } from "./types.js";
export { ImporterRegistry } from "./registry.js";
export { GitHubImporter } from "./github.js";
export { mapLabels } from "./label-mapper.js";
export { generateSpecFromIssue } from "./spec-generator.js";
export { jiraStubImporter, linearStubImporter } from "./stubs.js";

import { ImporterRegistry } from "./registry.js";
import { GitHubImporter } from "./github.js";
import { jiraStubImporter, linearStubImporter } from "./stubs.js";

/**
 * Create the default importer registry with all built-in importers.
 * GitHub is fully functional (with gh CLI check); Jira and Linear are stubs.
 */
export function createDefaultRegistry(): ImporterRegistry {
  const registry = new ImporterRegistry();
  registry.register(new GitHubImporter());
  registry.register(jiraStubImporter);
  registry.register(linearStubImporter);
  return registry;
}
