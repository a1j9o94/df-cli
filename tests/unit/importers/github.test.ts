import { describe, test, expect } from "bun:test";
import {
  GitHubImporter,
  parseGitHubIssueUrl,
  processComments,
} from "../../../src/importers/github.js";
import type { ExecFn } from "../../../src/importers/github.js";
import type { IssueImporter } from "../../../src/importers/types.js";

// ---- Test Helpers ----

function makeIssueJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    title: "Test Issue",
    body: "Test body content",
    labels: [{ name: "bug" }, { name: "p1" }],
    user: { login: "testuser" },
    ...overrides,
  });
}

function makeCommentsJson(
  comments: Array<{
    login: string;
    type?: string;
    date?: string;
    body?: string;
  }> = [],
): string {
  return JSON.stringify(
    comments.map((c, i) => ({
      user: { login: c.login, type: c.type ?? "User" },
      created_at: c.date ?? `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      body: c.body ?? `Comment by ${c.login}`,
    })),
  );
}

/** Creates a mock exec that responds to gh --version and gh api calls */
function createMockExec(
  issueJson: string = makeIssueJson(),
  commentsJson: string = makeCommentsJson(),
): ExecFn {
  return async (cmd: string): Promise<string> => {
    if (cmd.includes("gh --version")) {
      return "gh version 2.40.0 (2024-01-01)";
    }
    if (cmd.includes("/comments")) {
      return commentsJson;
    }
    if (cmd.includes("gh api repos/")) {
      return issueJson;
    }
    return "";
  };
}

// ---- Tests ----

describe("GitHubImporter", () => {
  describe("canHandle", () => {
    test("returns true for valid GitHub issue URLs", () => {
      const importer = new GitHubImporter();
      expect(importer.canHandle("https://github.com/owner/repo/issues/123")).toBe(true);
    });

    test("returns true for URLs with trailing slash", () => {
      const importer = new GitHubImporter();
      expect(importer.canHandle("https://github.com/owner/repo/issues/123/")).toBe(true);
    });

    test("returns true for URLs with query params", () => {
      const importer = new GitHubImporter();
      expect(importer.canHandle("https://github.com/owner/repo/issues/42?foo=bar")).toBe(true);
    });

    test("returns true for URLs with hash fragments", () => {
      const importer = new GitHubImporter();
      expect(importer.canHandle("https://github.com/owner/repo/issues/42#issuecomment-123")).toBe(true);
    });

    test("returns false for pull request URLs", () => {
      const importer = new GitHubImporter();
      expect(importer.canHandle("https://github.com/owner/repo/pull/123")).toBe(false);
    });

    test("returns false for non-GitHub URLs", () => {
      const importer = new GitHubImporter();
      expect(importer.canHandle("https://gitlab.com/owner/repo/issues/123")).toBe(false);
    });

    test("returns false for GitHub URLs without issue number", () => {
      const importer = new GitHubImporter();
      expect(importer.canHandle("https://github.com/owner/repo/issues")).toBe(false);
    });

    test("returns false for malformed URLs", () => {
      const importer = new GitHubImporter();
      expect(importer.canHandle("not-a-url")).toBe(false);
    });

    test("returns false for GitHub repo URLs without issues path", () => {
      const importer = new GitHubImporter();
      expect(importer.canHandle("https://github.com/owner/repo")).toBe(false);
    });

    test("returns false for non-numeric issue number", () => {
      const importer = new GitHubImporter();
      expect(importer.canHandle("https://github.com/owner/repo/issues/abc")).toBe(false);
    });
  });

  describe("parseGitHubIssueUrl", () => {
    test("extracts owner, repo, and number", () => {
      const ref = parseGitHubIssueUrl("https://github.com/my-org/my-repo/issues/42");
      expect(ref.owner).toBe("my-org");
      expect(ref.repo).toBe("my-repo");
      expect(ref.number).toBe(42);
    });

    test("handles http:// scheme", () => {
      const ref = parseGitHubIssueUrl("http://github.com/owner/repo/issues/1");
      expect(ref.owner).toBe("owner");
      expect(ref.number).toBe(1);
    });

    test("throws on pull request URL", () => {
      expect(() =>
        parseGitHubIssueUrl("https://github.com/owner/repo/pull/42"),
      ).toThrow("not a valid GitHub issue URL");
    });

    test("throws on missing issue number", () => {
      expect(() =>
        parseGitHubIssueUrl("https://github.com/owner/repo/issues"),
      ).toThrow("not a valid GitHub issue URL");
    });

    test("throws on non-GitHub URL", () => {
      expect(() =>
        parseGitHubIssueUrl("https://gitlab.com/owner/repo/issues/1"),
      ).toThrow("not a valid GitHub issue URL");
    });
  });

  describe("gh CLI check", () => {
    test("throws helpful error when gh CLI is not available", async () => {
      const failExec: ExecFn = async (cmd: string) => {
        if (cmd.includes("gh --version")) {
          throw new Error("command not found: gh");
        }
        return "";
      };

      const importer = new GitHubImporter(failExec);
      expect(
        importer.fetch("https://github.com/owner/repo/issues/1"),
      ).rejects.toThrow("GitHub CLI (gh) required");
    });

    test("error message includes install URL", async () => {
      const failExec: ExecFn = async (cmd: string) => {
        if (cmd.includes("gh --version")) {
          throw new Error("command not found: gh");
        }
        return "";
      };

      const importer = new GitHubImporter(failExec);
      try {
        await importer.fetch("https://github.com/owner/repo/issues/1");
      } catch (e: unknown) {
        expect((e as Error).message).toContain("https://cli.github.com");
        expect((e as Error).message).toContain("gh auth login");
      }
    });
  });

  describe("fetch", () => {
    test("returns IssueData with correct title and body", async () => {
      const mockExec = createMockExec(
        makeIssueJson({ title: "My Feature Request", body: "Please add this" }),
      );
      const importer = new GitHubImporter(mockExec);
      const data = await importer.fetch("https://github.com/owner/repo/issues/1");

      expect(data.title).toBe("My Feature Request");
      expect(data.body).toBe("Please add this");
    });

    test("returns labels as string array", async () => {
      const mockExec = createMockExec(
        makeIssueJson({
          labels: [{ name: "bug" }, { name: "urgent" }, { name: "help wanted" }],
        }),
      );
      const importer = new GitHubImporter(mockExec);
      const data = await importer.fetch("https://github.com/owner/repo/issues/1");

      expect(data.labels).toEqual(["bug", "urgent", "help wanted"]);
    });

    test("sets sourceUrl to the original URL", async () => {
      const mockExec = createMockExec();
      const importer = new GitHubImporter(mockExec);
      const url = "https://github.com/owner/repo/issues/99";
      const data = await importer.fetch(url);

      expect(data.sourceUrl).toBe(url);
    });

    test("handles null body gracefully", async () => {
      const mockExec = createMockExec(makeIssueJson({ body: null }));
      const importer = new GitHubImporter(mockExec);
      const data = await importer.fetch("https://github.com/owner/repo/issues/1");

      expect(data.body).toBe("");
    });

    test("calls correct gh api endpoints", async () => {
      const calledCommands: string[] = [];
      const mockExec: ExecFn = async (cmd: string) => {
        calledCommands.push(cmd);
        if (cmd.includes("gh --version")) return "gh version 2.40.0";
        if (cmd.includes("/comments")) return "[]";
        if (cmd.includes("gh api")) return makeIssueJson();
        return "";
      };

      const importer = new GitHubImporter(mockExec);
      await importer.fetch("https://github.com/my-org/cool-repo/issues/7");

      expect(calledCommands).toContainEqual(
        expect.stringContaining("gh api repos/my-org/cool-repo/issues/7"),
      );
      expect(calledCommands).toContainEqual(
        expect.stringContaining("gh api repos/my-org/cool-repo/issues/7/comments"),
      );
    });

    test("throws on malformed URL during fetch", async () => {
      const importer = new GitHubImporter();
      expect(importer.fetch("https://github.com/bad-url")).rejects.toThrow();
    });

    test("propagates gh api errors", async () => {
      const mockExec: ExecFn = async (cmd: string) => {
        if (cmd.includes("gh --version")) return "gh version 2.40.0";
        if (cmd.includes("gh api")) {
          throw new Error("HTTP 404: Not Found");
        }
        return "";
      };

      const importer = new GitHubImporter(mockExec);
      expect(
        importer.fetch("https://github.com/owner/repo/issues/99999"),
      ).rejects.toThrow("HTTP 404");
    });
  });

  describe("processComments", () => {
    test("filters out bot comments by [bot] suffix", () => {
      const comments = processComments([
        { user: { login: "human", type: "User" }, created_at: "2024-01-01T00:00:00Z", body: "Real comment" },
        { user: { login: "dependabot[bot]", type: "Bot" }, created_at: "2024-01-02T00:00:00Z", body: "Bot comment" },
        { user: { login: "github-actions[bot]", type: "Bot" }, created_at: "2024-01-03T00:00:00Z", body: "CI comment" },
      ]);

      expect(comments).toHaveLength(1);
      expect(comments[0].author).toBe("human");
    });

    test("filters out bot comments by Bot type", () => {
      const comments = processComments([
        { user: { login: "human", type: "User" }, created_at: "2024-01-01T00:00:00Z", body: "Real" },
        { user: { login: "some-bot", type: "Bot" }, created_at: "2024-01-02T00:00:00Z", body: "Bot" },
      ]);

      expect(comments).toHaveLength(1);
      expect(comments[0].author).toBe("human");
    });

    test("sorts comments by date descending (most recent first)", () => {
      const comments = processComments([
        { user: { login: "alice", type: "User" }, created_at: "2024-01-01T00:00:00Z", body: "First" },
        { user: { login: "bob", type: "User" }, created_at: "2024-01-03T00:00:00Z", body: "Third" },
        { user: { login: "carol", type: "User" }, created_at: "2024-01-02T00:00:00Z", body: "Second" },
      ]);

      expect(comments[0].author).toBe("bob");
      expect(comments[1].author).toBe("carol");
      expect(comments[2].author).toBe("alice");
    });

    test("takes at most 5 comments", () => {
      const rawComments = Array.from({ length: 10 }, (_, i) => ({
        user: { login: `user${i}`, type: "User" },
        created_at: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
        body: `Comment ${i}`,
      }));

      const comments = processComments(rawComments);
      expect(comments).toHaveLength(5);
    });

    test("truncates comment body to 500 chars", () => {
      const longBody = "x".repeat(600);
      const comments = processComments([
        { user: { login: "user", type: "User" }, created_at: "2024-01-01T00:00:00Z", body: longBody },
      ]);

      expect(comments[0].body.length).toBe(500);
      expect(comments[0].body.endsWith("...")).toBe(true);
    });

    test("does not truncate comment body at or under 500 chars", () => {
      const body = "x".repeat(500);
      const comments = processComments([
        { user: { login: "user", type: "User" }, created_at: "2024-01-01T00:00:00Z", body },
      ]);

      expect(comments[0].body).toBe(body);
      expect(comments[0].body.length).toBe(500);
    });

    test("sets isBot to false for all returned comments", () => {
      const comments = processComments([
        { user: { login: "human", type: "User" }, created_at: "2024-01-01T00:00:00Z", body: "Comment" },
      ]);

      expect(comments[0].isBot).toBe(false);
    });

    test("returns empty array for no comments", () => {
      const comments = processComments([]);
      expect(comments).toEqual([]);
    });

    test("returns empty array when all comments are bots", () => {
      const comments = processComments([
        { user: { login: "bot1[bot]", type: "Bot" }, created_at: "2024-01-01T00:00:00Z", body: "Beep" },
        { user: { login: "bot2[bot]", type: "Bot" }, created_at: "2024-01-02T00:00:00Z", body: "Boop" },
      ]);
      expect(comments).toEqual([]);
    });
  });

  describe("fetch with comments integration", () => {
    test("returns processed comments from fetched issue", async () => {
      const commentsJson = makeCommentsJson([
        { login: "alice", type: "User", date: "2024-01-03T00:00:00Z", body: "Latest comment" },
        { login: "dependabot[bot]", type: "Bot", date: "2024-01-02T00:00:00Z", body: "Bot noise" },
        { login: "bob", type: "User", date: "2024-01-01T00:00:00Z", body: "Older comment" },
      ]);

      const mockExec = createMockExec(makeIssueJson(), commentsJson);
      const importer = new GitHubImporter(mockExec);
      const data = await importer.fetch("https://github.com/owner/repo/issues/1");

      expect(data.comments).toHaveLength(2);
      expect(data.comments[0].author).toBe("alice");
      expect(data.comments[1].author).toBe("bob");
      expect(data.comments[0].isBot).toBe(false);
    });
  });

  describe("implements IssueImporter interface", () => {
    test("is assignable to IssueImporter", () => {
      const importer: IssueImporter = new GitHubImporter();
      expect(importer.canHandle).toBeDefined();
      expect(importer.fetch).toBeDefined();
    });
  });
});
