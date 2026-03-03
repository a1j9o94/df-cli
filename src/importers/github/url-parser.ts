export interface GitHubIssueRef {
  owner: string;
  repo: string;
  number: number;
}

const GITHUB_ISSUE_RE =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?(?:[?#].*)?$/;

/**
 * Parse a GitHub issue URL into its components (owner, repo, number).
 * Accepts URLs in the form: https://github.com/<owner>/<repo>/issues/<number>
 *
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
