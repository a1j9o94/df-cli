import { describe, test, expect, beforeEach } from "bun:test";
import { GitHubImporter } from "../../../src/importers/github.js";
import type { ExecFn } from "../../../src/importers/github.js";
import type { IssueData } from "../../../src/importers/types.js";

// Helper to create a mock exec that responds to gh --version and gh api calls
function createMockExec(
  issueJson: string = JSON.stringify({
    title: "Test",
    body: "Body",
    labels: [],
    user: { login: "author" },
  }),
  commentsJson: string = "[]",
): ExecFn {
  return async (cmd: string): Promise<string> => {
    if (cmd.includes("gh --version")) return "gh version 2.40.0";
    if (cmd.includes("/comments")) return commentsJson;
    if (cmd.includes("gh api repos/")) return issueJson;
    return "";
  };
}

describe("GitHubImporter (canonical, from github.ts)", () => {
  let importer: GitHubImporter;
  let mockExec: ExecFn;

  beforeEach(() => {
    mockExec = createMockExec();
    importer = new GitHubImporter(mockExec);
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

      const exec = createMockExec(issueJson, commentsJson);
      const imp = new GitHubImporter(exec);
      const data = await imp.fetch("https://github.com/org/repo/issues/123");

      expect(data.title).toBe("Fix auth redirect loop");
      expect(data.body).toContain("The login page redirects to itself.");
      expect(data.labels).toEqual(["bug", "p1"]);
      expect(data.sourceUrl).toBe("https://github.com/org/repo/issues/123");
      // GitHubImporter filters bots via processComments
      expect(data.comments).toHaveLength(1);
      expect(data.comments[0].author).toBe("reviewer1");
      expect(data.comments[0].isBot).toBe(false);
    });

    test("calls gh api with correct paths", async () => {
      const calledCommands: string[] = [];
      const exec: ExecFn = async (cmd: string) => {
        calledCommands.push(cmd);
        if (cmd.includes("gh --version")) return "gh version 2.40.0";
        if (cmd.includes("/comments")) return "[]";
        if (cmd.includes("gh api")) return JSON.stringify({
          title: "Test",
          body: "Body",
          labels: [],
          user: { login: "author" },
        });
        return "";
      };

      const imp = new GitHubImporter(exec);
      await imp.fetch("https://github.com/my-org/my-repo/issues/42");

      expect(calledCommands).toContainEqual(
        expect.stringContaining("gh api repos/my-org/my-repo/issues/42"),
      );
      expect(calledCommands).toContainEqual(
        expect.stringContaining("gh api repos/my-org/my-repo/issues/42/comments"),
      );
    });

    test("handles empty comments array", async () => {
      const data = await importer.fetch("https://github.com/org/repo/issues/1");
      expect(data.comments).toEqual([]);
    });

    test("handles issue with no labels", async () => {
      const data = await importer.fetch("https://github.com/org/repo/issues/1");
      expect(data.labels).toEqual([]);
    });

    test("throws on invalid URL", async () => {
      await expect(importer.fetch("not-a-url")).rejects.toThrow(/not a valid GitHub issue URL/);
    });

    test("checks gh --version BEFORE making API calls (contract: GitHubImporter gh CLI Check)", async () => {
      const calledCommands: string[] = [];
      const failExec: ExecFn = async (cmd: string) => {
        calledCommands.push(cmd);
        if (cmd.includes("gh --version")) {
          throw new Error("command not found: gh");
        }
        return "";
      };

      const imp = new GitHubImporter(failExec);
      await expect(
        imp.fetch("https://github.com/org/repo/issues/1"),
      ).rejects.toThrow(/GitHub CLI \(gh\) required.*https:\/\/cli\.github\.com.*gh auth login/s);

      // Verify no gh api calls were made
      const apiCalls = calledCommands.filter(c => c.includes("gh api"));
      expect(apiCalls).toHaveLength(0);
    });

    test("gh CLI error message matches contract regex exactly", async () => {
      const failExec: ExecFn = async (cmd: string) => {
        if (cmd.includes("gh --version")) {
          throw new Error("command not found: gh");
        }
        return "";
      };

      const imp = new GitHubImporter(failExec);
      try {
        await imp.fetch("https://github.com/org/repo/issues/1");
        expect(true).toBe(false); // Should not reach here
      } catch (e: unknown) {
        const msg = (e as Error).message;
        expect(msg).toContain("GitHub CLI (gh) required");
        expect(msg).toContain("https://cli.github.com");
        expect(msg).toContain("gh auth login");
      }
    });
  });
});
