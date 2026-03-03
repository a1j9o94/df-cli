import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { newSpecId } from "../utils/id.js";
import { mapLabels } from "./label-mapper.js";
import { generateSpecFromIssue } from "./spec-generator.js";
import type { ImporterRegistry } from "./registry.js";

export interface ImportSpecOptions {
  /** The issue URL to import */
  url: string;
  /** Path to the .df directory */
  dfDir: string;
  /** Importer registry to use */
  registry: ImporterRegistry;
  /** If true, return content without writing to disk */
  dryRun?: boolean;
}

export interface ImportSpecResult {
  specId: string;
  filePath: string;
  title: string;
  type: string;
  priority: string;
  sourceUrl: string;
  requirementsCount: number;
  scenariosCount: number;
  /** The original label that matched type, if any */
  typeSource?: string;
  /** The original label that matched priority, if any */
  prioritySource?: string;
  /** The generated spec content (always populated in dry-run, also in normal mode) */
  content: string;
}

/**
 * Import an issue from an external tracker and create a spec from it.
 *
 * 1. Resolves the right importer for the URL
 * 2. Fetches issue data
 * 3. Generates spec markdown
 * 4. Writes to disk (unless dry-run)
 * 5. Returns summary metadata
 */
export async function importAndCreateSpec(
  options: ImportSpecOptions,
): Promise<ImportSpecResult> {
  const { url, dfDir, registry, dryRun = false } = options;

  // Resolve importer
  const importer = registry.resolve(url);
  if (!importer) {
    throw new Error(
      `No importer found for URL: ${url}\nSupported sources: ${registry.listImporters().join(", ")}`,
    );
  }

  // Fetch issue data
  const issueData = await importer.fetch(url);

  // Generate spec
  const specId = newSpecId();
  const content = generateSpecFromIssue(issueData, specId);

  // Map labels for result summary
  const labelMapping = mapLabels(issueData.labels);

  // Count extracted items
  const requirementsCount = countRequirements(issueData.body);
  const scenariosCount = countScenarios(issueData.body);

  // Write to disk unless dry-run
  const relPath = join("specs", `${specId}.md`);
  if (!dryRun) {
    const absPath = join(dfDir, relPath);
    writeFileSync(absPath, content);
  }

  return {
    specId,
    filePath: join(".df", relPath),
    title: issueData.title,
    type: labelMapping.type,
    priority: labelMapping.priority,
    sourceUrl: issueData.sourceUrl,
    requirementsCount,
    scenariosCount,
    typeSource: labelMapping.typeSource,
    prioritySource: labelMapping.prioritySource,
    content,
  };
}

/** Count checkbox items and numbered list items outside AC/TC sections */
function countRequirements(body: string): number {
  let count = 0;

  const acStart = findSection(body, "Acceptance Criteria");
  const tcStart = findSection(body, "Test Cases");
  const cutoff = Math.min(
    acStart === -1 ? Number.POSITIVE_INFINITY : acStart,
    tcStart === -1 ? Number.POSITIVE_INFINITY : tcStart,
  );

  const bodyForReqs = cutoff === Number.POSITIVE_INFINITY ? body : body.slice(0, cutoff);

  // Checkboxes
  const checkboxRe = /^- \[[ x]\] .+$/gm;
  const checkboxMatches = bodyForReqs.match(checkboxRe);
  if (checkboxMatches) count += checkboxMatches.length;

  // Numbered lists
  const numberedRe = /^\d+\.\s+.+$/gm;
  const numberedMatches = bodyForReqs.match(numberedRe);
  if (numberedMatches) count += numberedMatches.length;

  return count;
}

/** Count items in Acceptance Criteria or Test Cases sections */
function countScenarios(body: string): number {
  let count = 0;
  for (const sectionName of ["Acceptance Criteria", "Test Cases"]) {
    const start = findSection(body, sectionName);
    if (start === -1) continue;

    const section = extractSectionContent(body, start);
    const checkboxRe = /^- \[[ x]\] .+$/gm;
    const matches = section.match(checkboxRe);
    if (matches) count += matches.length;

    const bulletRe = /^- (?!\[[ x]\]).+$/gm;
    const bulletMatches = section.match(bulletRe);
    if (bulletMatches) count += bulletMatches.length;
  }
  return count;
}

function findSection(body: string, name: string): number {
  const re = new RegExp(`^## ${name}`, "m");
  const match = re.exec(body);
  return match ? match.index : -1;
}

function extractSectionContent(body: string, start: number): string {
  const rest = body.slice(start);
  const nextHeading = rest.match(/\n## [^\n]+/);
  if (nextHeading?.index !== undefined) {
    return rest.slice(0, nextHeading.index);
  }
  return rest;
}
