import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateWorktreeGitignore } from "./protected-paths.js";

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

  // Inject .gitignore with protected paths to prevent state.db, .claude/, .letta/ from being committed
  const gitignoreContent = generateWorktreeGitignore();
  writeFileSync(join(dir, ".gitignore"), gitignoreContent);

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
