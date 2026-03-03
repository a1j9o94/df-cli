import { describe, test, expect, mock, beforeEach } from "bun:test";
import { GitHubIssueImporter } from "../../../src/importers/github/importer.js";
import type { IssueData } from "../../../src/importers/types.js";

// Mock the exec function used by the importer
const mockExec = mock<(cmd: string) => Promise<string>>();

describe("GitHubIssueImporter", () => {
  let importer: GitHubIssueImporter;

  beforeEach(() => {
    mockExec.mockReset();
    importer = new GitHubIssueImporter(mockExec);
  });

  describe("canHandle", () => {
    test("returns true for standard GitHub issue URL", () => {
      expect(importer.canHandle("https://github.com/org/repo/issues/123")).toBe(true);
    });

    test("returns true for http GitHub issue URL", () => {
      expect(importer.canHandle("http://github.com/org/repo/issues/1")).toBe(true);
    });

    test("returns false for GitHub PR URL", () => {
      expect(importer.canHandle("https://github.com/org/repo/pull/123")).toBe(false);
    });

    test("returns false for Jira URL", () => {
      expect(importer.canHandle("https://jira.atlassian.net/browse/PROJ-1")).toBe(false);
    });

    test("returns false for random URL", () => {
      expect(importer.canHandle("https://example.com/issue/1")).toBe(false);
    });
  });

  describe("name", () => {
    test("is 'github'", () => {
      expect(importer.name).toBe("github");
    });
  });

  describe("fetch", () => {
    test("fetches issue data and comments via gh CLI", async () => {
      const issueJson = JSON.stringify({
        title: "Fix auth redirect loop",
        body: "The login page redirects to itself.\n\n## Acceptance Criteria\n\n- [ ] No redirect loop",
        labels: [{ name: "bug" }, { name: "p1" }],
        user: { login: "author1" },
      });

      const commentsJson = JSON.stringify([
        {
          user: { login: "reviewer1", type: "User" },
          created_at: "2024-01-15T10:30:00Z",
          body: "I can reproduce this.",
        },
        {
          user: { login: "dependabot[bot]", type: "Bot" },
          created_at: "2024-01-16T09:00:00Z",
          body: "Automated security update.",
        },
      ]);

      mockExec.mockImplementation(async (cmd: string) => {
        if (cmd.includes("/comments")) return commentsJson;
        return issueJson;
      });

      const data = await importer.fetch("https://github.com/org/repo/issues/123");

      expect(data.title).toBe("Fix auth redirect loop");
      expect(data.body).toContain("The login page redirects to itself.");
      expect(data.labels).toEqual(["bug", "p1"]);
      expect(data.sourceUrl).toBe("https://github.com/org/repo/issues/123");
      expect(data.comments).toHaveLength(2);
      expect(data.comments[0].author).toBe("reviewer1");
      expect(data.comments[0].isBot).toBe(false);
      expect(data.comments[1].author).toBe("dependabot[bot]");
      expect(data.comments[1].isBot).toBe(true);
    });

    test("calls gh api with correct paths", async () => {
      mockExec.mockImplementation(async (cmd: string) => {
        if (cmd.includes("/comments")) return "[]";
        return JSON.stringify({
          title: "Test",
          body: "Body",
          labels: [],
          user: { login: "author" },
        });
      });

      await importer.fetch("https://github.com/my-org/my-repo/issues/42");

      const calls = mockExec.mock.calls.map((c) => c[0]);
      expect(calls).toContain("gh api repos/my-org/my-repo/issues/42");
      expect(calls).toContain("gh api repos/my-org/my-repo/issues/42/comments");
    });

    test("handles empty comments array", async () => {
      mockExec.mockImplementation(async (cmd: string) => {
        if (cmd.includes("/comments")) return "[]";
        return JSON.stringify({
          title: "Test",
          body: "Body",
          labels: [],
          user: { login: "author" },
        });
      });

      const data = await importer.fetch("https://github.com/org/repo/issues/1");
      expect(data.comments).toEqual([]);
    });

    test("handles issue with no labels", async () => {
      mockExec.mockImplementation(async (cmd: string) => {
        if (cmd.includes("/comments")) return "[]";
        return JSON.stringify({
          title: "Test",
          body: "Body",
          labels: [],
          user: { login: "author" },
        });
      });

      const data = await importer.fetch("https://github.com/org/repo/issues/1");
      expect(data.labels).toEqual([]);
    });

    test("throws on invalid URL", async () => {
      await expect(importer.fetch("not-a-url")).rejects.toThrow(/not a valid GitHub issue URL/);
    });

    test("throws on gh CLI failure", async () => {
      mockExec.mockRejectedValue(new Error("gh: command not found"));
      await expect(
        importer.fetch("https://github.com/org/repo/issues/1"),
      ).rejects.toThrow(/gh/);
    });
  });
});
