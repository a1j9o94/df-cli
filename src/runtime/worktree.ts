import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

export interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
}

export function createWorktree(
  basePath: string,
  branch: string,
  targetDir?: string,
): WorktreeInfo {
  const dir = targetDir ?? `${basePath}/.df/worktrees/${branch}`;

  execSync(`git worktree add -b ${branch} "${dir}" HEAD`, {
    cwd: basePath,
    stdio: "pipe",
  });

  const head = execSync("git rev-parse HEAD", {
    cwd: dir,
    encoding: "utf-8",
  }).trim();

  return { path: dir, branch, head };
}

export function removeWorktree(path: string): void {
  if (!existsSync(path)) return;

  // Find the main repo by going up from the worktree
  execSync(`git worktree remove "${path}" --force`, {
    stdio: "pipe",
  });
}

export function listWorktrees(basePath?: string): WorktreeInfo[] {
  const cwd = basePath ?? process.cwd();
  const output = execSync("git worktree list --porcelain", {
    cwd,
    encoding: "utf-8",
  });

  const worktrees: WorktreeInfo[] = [];
  let current: Partial<WorktreeInfo> = {};

  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (current.path) {
        worktrees.push(current as WorktreeInfo);
      }
      current = { path: line.slice(9) };
    } else if (line.startsWith("HEAD ")) {
      current.head = line.slice(5);
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice(7).replace("refs/heads/", "");
    } else if (line === "" && current.path) {
      worktrees.push({
        path: current.path,
        branch: current.branch ?? "(detached)",
        head: current.head ?? "",
      });
      current = {};
    }
  }

  if (current.path) {
    worktrees.push({
      path: current.path,
      branch: current.branch ?? "(detached)",
      head: current.head ?? "",
    });
  }

  return worktrees;
}

/**
 * Info about a single commit in a worktree.
 */
export interface WorktreeCommit {
  hash: string;
  message: string;
}

/**
 * Returns commits made in a worktree since it was branched from its parent.
 * Uses `git log` from HEAD back to the fork point (where the worktree branch
 * diverged from the commit it was created at).
 *
 * Returns commits in chronological order (oldest first).
 * Returns an empty array if no commits have been made or the path doesn't exist.
 */
export function getWorktreeCommits(worktreePath: string): WorktreeCommit[] {
  if (!existsSync(worktreePath)) return [];

  try {
    // Find the commit the worktree was branched from (main repo's HEAD),
    // then list all commits since that point.
    const mainBranch = getMainBranchFromWorktree(worktreePath);

    const output = execSync(
      `git log --format="%H %s" --reverse ${mainBranch}..HEAD`,
      { cwd: worktreePath, encoding: "utf-8" },
    ).trim();

    if (!output) return [];

    return output.split("\n").map((line) => {
      const spaceIdx = line.indexOf(" ");
      return {
        hash: line.slice(0, spaceIdx),
        message: line.slice(spaceIdx + 1),
      };
    });
  } catch {
    return [];
  }
}

/**
 * Returns true if the worktree has any commits since it was created.
 * Returns false for nonexistent paths or worktrees with no new commits.
 */
export function worktreeHasCommits(worktreePath: string): boolean {
  if (!existsSync(worktreePath)) return false;
  try {
    const commits = getWorktreeCommits(worktreePath);
    return commits.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the "main" branch (or the branch the worktree was forked from)
 * by looking at the common git directory's HEAD.
 */
function getMainBranchFromWorktree(worktreePath: string): string {
  try {
    // The common git dir points to the parent repo's .git
    const commonDir = execSync(
      "git rev-parse --path-format=absolute --git-common-dir",
      { cwd: worktreePath, encoding: "utf-8" },
    ).trim();

    // Read what HEAD points to in the main repo
    const mainHead = execSync("git rev-parse HEAD", {
      cwd: commonDir.replace(/\/.git$/, ""),
      encoding: "utf-8",
    }).trim();

    return mainHead;
  } catch {
    // Fallback: use the initial commit of the repo
    return execSync("git rev-list --max-parents=0 HEAD", {
      cwd: worktreePath,
      encoding: "utf-8",
    }).trim();
  }
}

export function mergeWorktree(worktreePath: string, targetBranch: string): void {
  // Get the branch name of the worktree
  const branch = execSync("git rev-parse --abbrev-ref HEAD", {
    cwd: worktreePath,
    encoding: "utf-8",
  }).trim();

  // Find the main repo path
  const mainRepo = execSync("git rev-parse --path-format=absolute --git-common-dir", {
    cwd: worktreePath,
    encoding: "utf-8",
  }).trim().replace(/\/.git$/, "");

  // Merge from the main repo
  execSync(`git merge ${branch} --no-edit`, {
    cwd: mainRepo,
    stdio: "pipe",
    env: { ...process.env, GIT_WORK_TREE: mainRepo },
  });
}
