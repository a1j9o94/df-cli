import { serializeFrontmatter } from "../utils/frontmatter.js";
import { mapLabels } from "./label-mapper.js";
import type { IssueData, Comment } from "./types.js";

/** Maximum number of non-bot comments to include */
const MAX_COMMENTS = 5;
/** Maximum characters per comment body */
const MAX_COMMENT_LENGTH = 500;

interface ParsedBody {
  goal: string;
  requirements: string[];
  scenarios: string[];
}

/**
 * Parse an issue body into structured sections.
 * Looks for ## Description, checkbox lists, numbered lists,
 * ## Acceptance Criteria, and ## Test Cases.
 */
function parseIssueBody(body: string): ParsedBody {
  const goal = extractGoal(body);
  const requirements = extractRequirements(body);
  const scenarios = extractScenarios(body);

  return { goal, requirements, scenarios };
}

function extractGoal(body: string): string {
  // Try to find a ## Description section
  const descMatch = body.match(/## Description\s*\n+([\s\S]*?)(?=\n##|\n- \[|\n\d+\.|$)/);
  if (descMatch) {
    return descMatch[1].trim();
  }

  // Try first paragraph before any structured content
  const firstParaMatch = body.match(/^([\s\S]*?)(?=\n- \[|\n\d+\.|\n##|$)/);
  if (firstParaMatch && firstParaMatch[1].trim()) {
    return firstParaMatch[1].trim();
  }

  return body.trim();
}

function extractRequirements(body: string): string[] {
  const requirements: string[] = [];

  // Extract checkbox items: - [ ] item or - [x] item
  const checkboxRe = /^- \[[ x]\] (.+)$/gm;
  let match: RegExpExecArray | null;

  // Don't extract checkboxes that are inside Acceptance Criteria or Test Cases sections
  const acIndex = findSectionStart(body, "Acceptance Criteria");
  const tcIndex = findSectionStart(body, "Test Cases");
  const scenarioStart = Math.min(
    acIndex === -1 ? Number.POSITIVE_INFINITY : acIndex,
    tcIndex === -1 ? Number.POSITIVE_INFINITY : tcIndex,
  );

  const bodyForReqs = scenarioStart === Number.POSITIVE_INFINITY ? body : body.slice(0, scenarioStart);

  while ((match = checkboxRe.exec(bodyForReqs)) !== null) {
    requirements.push(match[1].trim());
  }

  // Extract numbered list items: 1. item
  const numberedRe = /^\d+\.\s+(.+)$/gm;
  const numberedBody = scenarioStart === Number.POSITIVE_INFINITY ? body : body.slice(0, scenarioStart);

  while ((match = numberedRe.exec(numberedBody)) !== null) {
    requirements.push(match[1].trim());
  }

  return requirements;
}

function extractScenarios(body: string): string[] {
  const scenarios: string[] = [];

  // Look for ## Acceptance Criteria or ## Test Cases
  for (const sectionName of ["Acceptance Criteria", "Test Cases"]) {
    const start = findSectionStart(body, sectionName);
    if (start === -1) continue;

    const sectionContent = extractSection(body, start);
    const checkboxRe = /^- \[[ x]\] (.+)$/gm;
    let match: RegExpExecArray | null;

    while ((match = checkboxRe.exec(sectionContent)) !== null) {
      scenarios.push(match[1].trim());
    }

    // Also look for plain list items in scenarios
    const bulletRe = /^- (?!\[[ x]\])(.+)$/gm;
    while ((match = bulletRe.exec(sectionContent)) !== null) {
      scenarios.push(match[1].trim());
    }
  }

  return scenarios;
}

function findSectionStart(body: string, sectionName: string): number {
  const re = new RegExp(`^## ${sectionName}`, "m");
  const match = re.exec(body);
  return match ? match.index : -1;
}

function extractSection(body: string, start: number): string {
  // Find the next ## heading after start
  const rest = body.slice(start);
  const nextHeading = rest.match(/\n## [^\n]+/);
  if (nextHeading && nextHeading.index !== undefined) {
    return rest.slice(0, nextHeading.index);
  }
  return rest;
}

/**
 * Filter and format comments for the spec discussion section.
 * - Skips bot comments
 * - Takes most recent 5
 * - Truncates long bodies
 */
function formatComments(comments: Comment[]): string | null {
  const nonBotComments = comments.filter((c) => !c.isBot);
  if (nonBotComments.length === 0) return null;

  // Take last MAX_COMMENTS
  const recent = nonBotComments.slice(-MAX_COMMENTS);

  const lines = recent.map((c) => {
    const dateStr = c.date.split("T")[0];
    const truncatedBody =
      c.body.length > MAX_COMMENT_LENGTH
        ? `${c.body.slice(0, MAX_COMMENT_LENGTH)}...`
        : c.body;
    return `**${c.author}** (${dateStr}):\n${truncatedBody}`;
  });

  return lines.join("\n\n");
}

/**
 * Generate a spec markdown string from normalized issue data.
 *
 * The generated spec always has status: draft. It includes:
 * - Frontmatter with id, title, type, priority, status, version, source_url
 * - # Heading with issue title
 * - ## Goal from issue description
 * - ## Requirements from checkbox/numbered lists
 * - ## Scenarios > Functional from acceptance criteria / test cases
 * - ## Context from Discussion (if non-bot comments exist)
 */
export function generateSpecFromIssue(issue: IssueData, specId: string): string {
  const { type, priority } = mapLabels(issue.labels);
  const parsed = parseIssueBody(issue.body);

  // Build frontmatter
  const frontmatter: Record<string, unknown> = {
    id: specId,
    title: issue.title,
    type,
    status: "draft",
    version: "0.1.0",
    priority,
    source_url: issue.sourceUrl,
  };

  // Build body sections
  const sections: string[] = [];

  // Title heading
  sections.push(`# ${issue.title}`);

  // Goal
  sections.push("## Goal");
  sections.push(parsed.goal);

  // Requirements
  sections.push("## Requirements");
  if (parsed.requirements.length > 0) {
    for (const req of parsed.requirements) {
      sections.push(`- ${req}`);
    }
  } else {
    sections.push("- TODO: Extract requirements from the issue description");
  }

  // Scenarios
  sections.push("## Scenarios");
  sections.push("### Functional");
  if (parsed.scenarios.length > 0) {
    for (let i = 0; i < parsed.scenarios.length; i++) {
      sections.push(`${i + 1}. **Scenario ${i + 1}**: ${parsed.scenarios[i]}`);
    }
  } else {
    sections.push("1. **TODO**: Define functional test scenarios based on the requirements above.");
  }

  sections.push("### Changeability");
  sections.push("1. **TODO**: Define a modification scenario that should be easy to make.");

  // Comments section
  const commentSection = formatComments(issue.comments);
  if (commentSection) {
    sections.push("## Context from Discussion");
    sections.push(commentSection);
  }

  const body = sections.join("\n\n");
  return serializeFrontmatter(frontmatter, `${body}\n`);
}
