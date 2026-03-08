/**
 * Command to create a workspace-level spec that spans multiple projects.
 *
 * Usage:
 *   dark spec workspace-create "Add cross-repo feature" --projects backend,frontend
 *
 * Creates a spec in the workspace-level .df-workspace/specs/ directory
 * with metadata indicating which projects are involved.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { WorkspaceConfig } from "../../types/workspace.js";

export interface WorkspaceSpecOptions {
  /** Title/description of the workspace spec */
  title: string;
  /** Comma-separated list of project names from the workspace config */
  projects?: string[];
  /** Path to the workspace root (defaults to cwd) */
  workspaceDir?: string;
}

/**
 * Create a workspace-level spec file.
 *
 * @param options - Spec creation options
 * @returns The path to the created spec file
 */
export function createWorkspaceSpec(options: WorkspaceSpecOptions): string {
  const workspaceDir = resolve(options.workspaceDir ?? process.cwd());
  const dfWorkspaceDir = join(workspaceDir, ".df-workspace");

  if (!existsSync(dfWorkspaceDir)) {
    throw new Error(
      `No .df-workspace/ directory found at ${workspaceDir}. ` +
      `Run 'dark workspace init' first to set up a multi-repo workspace.`,
    );
  }

  const specsDir = join(dfWorkspaceDir, "specs");
  mkdirSync(specsDir, { recursive: true });

  // Generate spec ID
  const specId = `spec_ws_${Date.now().toString(36)}`;
  const slug = options.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const specFileName = `${specId}-${slug}.md`;
  const specPath = join(specsDir, specFileName);

  const projectsList = options.projects?.length
    ? options.projects.map((p) => `  - ${p}`).join("\n")
    : "  # Add project names here";

  const specContent = `---
id: ${specId}
title: "${options.title}"
type: feature
status: draft
version: 0.1.0
workspace: true
projects:
${projectsList}
---

# ${options.title}

## Goal

<!-- Describe what this workspace-level spec achieves across projects -->

## Requirements

<!-- List requirements, noting which project each applies to -->

## Contracts

<!-- Define cross-project contracts (API schemas, shared types, etc.) -->

## Scenarios

### Functional

<!-- Cross-project integration scenarios -->

### Changeability

<!-- Scenarios that test how easily the cross-project system can be modified -->
`;

  writeFileSync(specPath, specContent);
  return specPath;
}
