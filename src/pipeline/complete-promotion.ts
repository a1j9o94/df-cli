/**
 * Branch promotion logic for `dark agent complete`.
 *
 * After a builder's completion guards pass, the staging branch
 * (df-staging/<run-short>/<module-slug>) is promoted to a ready branch
 * (df-ready/<run-short>/<module-slug>). The merge phase only considers
 * df-ready/ branches.
 *
 * This separation ensures that code which hasn't passed guards
 * never reaches the merge phase.
 */

import { execSync } from "node:child_process";
import type { SqliteDb } from "../db/index.js";
import { getAgent, updateAgentBranchName } from "../db/queries/agents.js";
import { createEvent } from "../db/queries/events.js";

const STAGING_PREFIX = "df-staging/";
const READY_PREFIX = "df-ready/";

// --- Branch naming helpers ---

export function isStagingBranch(branchName: string): boolean {
  return branchName.startsWith(STAGING_PREFIX);
}

export function isReadyBranch(branchName: string): boolean {
  return branchName.startsWith(READY_PREFIX);
}

export function toReadyBranch(stagingBranch: string): string {
  if (!isStagingBranch(stagingBranch)) {
    throw new Error(
      `Cannot convert '${stagingBranch}' to ready branch: not a staging branch (must start with '${STAGING_PREFIX}')`,
    );
  }
  return READY_PREFIX + stagingBranch.slice(STAGING_PREFIX.length);
}

export interface StagingBranchParts {
  prefix: string;
  runShort: string;
  moduleSlug: string;
}

export function parseStagingBranch(branchName: string): StagingBranchParts | null {
  if (!isStagingBranch(branchName)) {
    return null;
  }
  // Format: df-staging/<run-short>/<module-slug>
  const withoutPrefix = branchName.slice(STAGING_PREFIX.length);
  const slashIndex = withoutPrefix.indexOf("/");
  if (slashIndex === -1) {
    return null;
  }
  return {
    prefix: "df-staging",
    runShort: withoutPrefix.slice(0, slashIndex),
    moduleSlug: withoutPrefix.slice(slashIndex + 1),
  };
}

// --- Promotion logic ---

export interface PromotionResult {
  success: boolean;
  oldBranch?: string;
  newBranch?: string;
  error?: string;
}

export interface PromotionOptions {
  /** Skip the actual git branch -m rename (for testing without a real worktree) */
  skipGitRename?: boolean;
}

/**
 * Promotes a builder agent's branch from df-staging/ to df-ready/.
 *
 * Steps:
 * 1. Look up agent and validate branch_name is a staging branch
 * 2. Compute the ready branch name
 * 3. Rename the git branch in the worktree (unless skipGitRename)
 * 4. Update the agent's branch_name in the DB
 * 5. Emit an `agent-branch-promoted` event
 */
export function promoteBranch(
  db: SqliteDb,
  agentId: string,
  options: PromotionOptions = {},
): PromotionResult {
  const agent = getAgent(db, agentId);
  if (!agent) {
    return { success: false, error: `Agent '${agentId}' not found` };
  }

  const oldBranch = agent.branch_name;
  if (!oldBranch) {
    return { success: false, error: `Agent '${agentId}' has no branch_name set` };
  }

  if (!isStagingBranch(oldBranch)) {
    return {
      success: false,
      error: `Branch '${oldBranch}' is not a staging branch (must start with '${STAGING_PREFIX}')`,
    };
  }

  const newBranch = toReadyBranch(oldBranch);

  // Rename the git branch (atomic operation)
  if (!options.skipGitRename) {
    const worktreePath = agent.worktree_path;
    if (!worktreePath) {
      return {
        success: false,
        error: `Agent '${agentId}' has no worktree_path — cannot rename branch`,
      };
    }

    try {
      execSync(`git branch -m "${oldBranch}" "${newBranch}"`, {
        cwd: worktreePath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Failed to rename branch: ${message}`,
      };
    }
  }

  // Update agent's branch_name in DB
  updateAgentBranchName(db, agentId, newBranch);

  // Emit agent-branch-promoted event
  createEvent(
    db,
    agent.run_id,
    "agent-branch-promoted",
    { oldBranch, newBranch },
    agentId,
  );

  return { success: true, oldBranch, newBranch };
}
