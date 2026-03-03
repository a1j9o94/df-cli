import { parseGitHubIssueUrl } from "./url-parser.js";
import type { IssueData, IssueImporter, Comment } from "../types.js";

/** Type for the exec function, allowing dependency injection for testing */
export type ExecFn = (cmd: string) => Promise<string>;

/** Default exec implementation using Bun shell */
async function defaultExec(cmd: string): Promise<string> {
  const proc = Bun.spawn(cmd.split(" "), {
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

interface GitHubIssueResponse {
  title: string;
  body: string;
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
 */
export class GitHubIssueImporter implements IssueImporter {
  readonly name = "github";
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

    // Fetch issue and comments in parallel
    const [issueJson, commentsJson] = await Promise.all([
      this.exec(`gh api repos/${owner}/${repo}/issues/${number}`),
      this.exec(`gh api repos/${owner}/${repo}/issues/${number}/comments`),
    ]);

    const issue: GitHubIssueResponse = JSON.parse(issueJson);
    const rawComments: GitHubCommentResponse[] = JSON.parse(commentsJson);

    const labels = issue.labels.map((l) => l.name);
    const comments: Comment[] = rawComments.map((c) => ({
      author: c.user.login,
      date: c.created_at,
      body: c.body,
      isBot: c.user.type === "Bot",
    }));

    return {
      title: issue.title,
      body: issue.body ?? "",
      labels,
      comments,
      sourceUrl: url,
    };
  }
}
