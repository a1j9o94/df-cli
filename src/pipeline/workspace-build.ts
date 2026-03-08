/**
 * Cross-repo build dispatch — routes module builds to the correct project repository.
 *
 * Implements the Cross-repo Build Dispatch Contract (ctr_01KK7SWX607ANW15KEWT807ZNG).
 *
 * When a workspace spec is built, the architect tags each module with a `targetProject`.
 * This module resolves that tag to a ProjectRef, creates worktrees in the correct repo,
 * and provides access to per-project state databases.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Database } from "bun:sqlite";
import type { WorkspaceConfig, ProjectRef, CrossRepoModule } from "../types/workspace.js";
import type { WorktreeInfo } from "../runtime/worktree.js";
import { createWorktree } from "../runtime/worktree.js";

/**
 * Resolve which project a module belongs to based on its targetProject field.
 *
 * @param module - A module definition with a targetProject field
 * @param workspaceConfig - The workspace configuration with project list
 * @returns The ProjectRef for the target project
 * @throws If the targetProject is not found in the workspace config
 */
export function resolveModuleProject(
  module: CrossRepoModule,
  workspaceConfig: WorkspaceConfig,
): ProjectRef {
  const project = workspaceConfig.projects.find(
    (p) => p.name === module.targetProject,
  );

  if (!project) {
    const available = workspaceConfig.projects.map((p) => p.name).join(", ");
    throw new Error(
      `Project "${module.targetProject}" not found in workspace config. ` +
      `Available projects: ${available}`,
    );
  }

  return project;
}

/**
 * Create an isolated worktree for a module build within a specific project's repository.
 *
 * The worktree is created in /tmp/df-worktrees/ to isolate from .df/scenarios/.
 * The branch name includes the module ID for traceability.
 *
 * @param projectRef - The project to create the worktree from
 * @param moduleId - Module identifier (used in branch and directory names)
 * @param branch - Branch name prefix for the worktree
 * @returns WorktreeInfo with path, branch, and HEAD commit
 */
export function createProjectWorktree(
  projectRef: ProjectRef,
  moduleId: string,
  branch: string,
): WorktreeInfo {
  const suffix = Date.now().toString(36);
  const branchName = `${branch}/${moduleId}-${suffix}`;
  const worktreeDir = join(tmpdir(), "df-worktrees", `${moduleId}-${suffix}`);

  return createWorktree(projectRef.path, branchName, worktreeDir);
}

/**
 * Get (or create) a project-level state database.
 *
 * Each project in a workspace can have its own state.db for tracking
 * project-specific runs, agents, and build state.
 *
 * @param projectRef - The project reference with dfDir path
 * @returns A bun:sqlite Database instance for the project
 */
export function getProjectDb(projectRef: ProjectRef): Database {
  const dbPath = join(projectRef.dfDir, "state.db");

  if (!existsSync(projectRef.dfDir)) {
    mkdirSync(projectRef.dfDir, { recursive: true });
  }

  return new Database(dbPath);
}
