import { describe, test, expect } from "bun:test";
import { parseGitHubIssueUrl } from "../../../src/importers/github/url-parser.js";

describe("parseGitHubIssueUrl", () => {
  test("parses a standard GitHub issue URL", () => {
    const result = parseGitHubIssueUrl("https://github.com/org/repo/issues/123");
    expect(result).toEqual({ owner: "org", repo: "repo", number: 123 });
  });

  test("parses URL with different owner/repo names", () => {
    const result = parseGitHubIssueUrl("https://github.com/my-company/my-project/issues/42");
    expect(result).toEqual({ owner: "my-company", repo: "my-project", number: 42 });
  });

  test("parses URL with http scheme", () => {
    const result = parseGitHubIssueUrl("http://github.com/org/repo/issues/1");
    expect(result).toEqual({ owner: "org", repo: "repo", number: 1 });
  });

  test("parses URL with trailing slash", () => {
    const result = parseGitHubIssueUrl("https://github.com/org/repo/issues/99/");
    expect(result).toEqual({ owner: "org", repo: "repo", number: 99 });
  });

  test("rejects non-GitHub URL", () => {
    expect(() => parseGitHubIssueUrl("https://gitlab.com/org/repo/issues/1")).toThrow(
      /not a valid GitHub issue URL/,
    );
  });

  test("rejects GitHub URL that is not an issue", () => {
    expect(() => parseGitHubIssueUrl("https://github.com/org/repo/pull/1")).toThrow(
      /not a valid GitHub issue URL/,
    );
  });

  test("rejects GitHub URL without issue number", () => {
    expect(() => parseGitHubIssueUrl("https://github.com/org/repo/issues")).toThrow(
      /not a valid GitHub issue URL/,
    );
  });

  test("rejects GitHub URL with non-numeric issue number", () => {
    expect(() => parseGitHubIssueUrl("https://github.com/org/repo/issues/abc")).toThrow(
      /not a valid GitHub issue URL/,
    );
  });

  test("rejects completely malformed URL", () => {
    expect(() => parseGitHubIssueUrl("not a url")).toThrow(/not a valid GitHub issue URL/);
  });

  test("rejects empty string", () => {
    expect(() => parseGitHubIssueUrl("")).toThrow(/not a valid GitHub issue URL/);
  });

  test("handles URL with query parameters", () => {
    const result = parseGitHubIssueUrl("https://github.com/org/repo/issues/5?tab=comments");
    expect(result).toEqual({ owner: "org", repo: "repo", number: 5 });
  });

  test("handles URL with fragment", () => {
    const result = parseGitHubIssueUrl("https://github.com/org/repo/issues/7#issuecomment-123");
    expect(result).toEqual({ owner: "org", repo: "repo", number: 7 });
  });
});
