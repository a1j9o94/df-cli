import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { writeWorktreeGitignore } from "./worktree-isolation.js";

export interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
}

/**
 * Pre-commit hook script that prevents committing .df/state.db* files.
 * This is the last line of defense even if .gitignore is bypassed with `git add -f`.
 */
const PRE_COMMIT_HOOK = `#!/bin/sh
# Dark Factory worktree isolation — pre-commit hook
# Prevents accidental commits of state DB files that could corrupt the main repo.

FORBIDDEN_PATTERNS=".df/state.db"

# Check staged files for forbidden patterns
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)

for file in $STAGED_FILES; do
  case "$file" in
    .df/state.db*)
      echo "ERROR: Refusing to commit '$file' — state DB files must not be committed from worktrees."
      echo "       This protects the main repo from corruption during merges."
      echo "       Unstage with: git reset HEAD '$file'"
      exit 1
      ;;
    .claude/*)
      echo "ERROR: Refusing to commit '$file' — .claude/ files must not be committed from worktrees."
      exit 1
      ;;
    .letta/*)
      echo "ERROR: Refusing to commit '$file' — .letta/ files must not be committed from worktrees."
      exit 1
      ;;
  esac
done

exit 0
`;

/**
 * Install a pre-commit hook in the worktree's git directory.
 * For worktrees, the git directory is referenced by the .git file.
 */
function installPreCommitHook(worktreePath: string): void {
  const dotGitPath = join(worktreePath, ".git");
  if (!existsSync(dotGitPath)) return;

  // In a worktree, .git is a file with "gitdir: /path/to/.git/worktrees/<branch>"
  const dotGitContent = readFileSync(dotGitPath, "utf-8").trim();
  const gitDirPath = dotGitContent.replace("gitdir: ", "");

  const hooksDir = join(gitDirPath, "hooks");
  mkdirSync(hooksDir, { recursive: true });

  const hookPath = join(hooksDir, "pre-commit");
  writeFileSync(hookPath, PRE_COMMIT_HOOK);
  chmodSync(hookPath, 0o755);
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

  // Apply worktree isolation: .gitignore + pre-commit hook
  writeWorktreeGitignore(dir);
  installPreCommitHook(dir);

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
