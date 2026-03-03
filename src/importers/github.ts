import type { IssueData, IssueImporter, Comment } from "./types.js";

/** Type for the exec function, allowing dependency injection for testing */
export type ExecFn = (cmd: string) => Promise<string>;

/** Default exec implementation using Bun shell */
async function defaultExec(cmd: string): Promise<string> {
  const proc = Bun.spawn(["sh", "-c", cmd], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Command failed (exit ${exitCode}): ${cmd}\n${stderr}`);
  }
  return output;
}

export interface GitHubIssueRef {
  owner: string;
  repo: string;
  number: number;
}

const GITHUB_ISSUE_RE =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?(?:[?#].*)?$/;

/**
 * Parse a GitHub issue URL into its components (owner, repo, number).
 * @throws Error if the URL is not a valid GitHub issue URL
 */
export function parseGitHubIssueUrl(url: string): GitHubIssueRef {
  const match = url.match(GITHUB_ISSUE_RE);
  if (!match) {
    throw new Error(
      `"${url}" is not a valid GitHub issue URL. Expected format: https://github.com/<owner>/<repo>/issues/<number>`,
    );
  }
  return {
    owner: match[1],
    repo: match[2],
    number: Number.parseInt(match[3], 10),
  };
}

interface GitHubIssueResponse {
  title: string;
  body: string | null;
  labels: Array<{ name: string }>;
  user: { login: string };
}

interface GitHubCommentResponse {
  user: { login: string; type: string };
  created_at: string;
  body: string;
}

/**
 * Imports issues from GitHub using the gh CLI.
 * Requires gh CLI to be installed and authenticated.
 *
 * Contract: IssueImporter Interface (ctr_01KJSSJ7TEN1XPE5EX1FAS71F8)
 */
export class GitHubImporter implements IssueImporter {
  private exec: ExecFn;

  constructor(exec?: ExecFn) {
    this.exec = exec ?? defaultExec;
  }

  canHandle(url: string): boolean {
    try {
      parseGitHubIssueUrl(url);
      return true;
    } catch {
      return false;
    }
  }

  async fetch(url: string): Promise<IssueData> {
    const { owner, repo, number } = parseGitHubIssueUrl(url);

    // Check gh CLI availability
    try {
      await this.exec("gh --version");
    } catch {
      throw new Error(
        "GitHub CLI (gh) required. Install: https://cli.github.com and run gh auth login",
      );
    }

    // Fetch issue and comments in parallel
    const [issueJson, commentsJson] = await Promise.all([
      this.exec(`gh api repos/${owner}/${repo}/issues/${number}`),
      this.exec(`gh api repos/${owner}/${repo}/issues/${number}/comments`),
    ]);

    const issue: GitHubIssueResponse = JSON.parse(issueJson);
    const rawComments: GitHubCommentResponse[] = JSON.parse(commentsJson);

    const labels = issue.labels.map((l) => l.name);

    // Process comments: filter bots, sort by date desc, take 5, truncate
    const comments = processComments(rawComments);

    return {
      title: issue.title,
      body: issue.body ?? "",
      labels,
      comments,
      sourceUrl: url,
    };
  }
}

/**
 * Process raw GitHub comments:
 * 1. Filter out bot comments (author login ending in [bot])
 * 2. Sort by date descending (most recent first)
 * 3. Take at most 5
 * 4. Truncate body to 500 chars each
 */
export function processComments(
  rawComments: GitHubCommentResponse[],
): Comment[] {
  return rawComments
    .filter((c) => !c.user.login.endsWith("[bot]") && c.user.type !== "Bot")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5)
    .map((c) => ({
      author: c.user.login,
      date: c.created_at,
      body: c.body.length > 500 ? `${c.body.slice(0, 497)}...` : c.body,
      isBot: false,
    }));
}
