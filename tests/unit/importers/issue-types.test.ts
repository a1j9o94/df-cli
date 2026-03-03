import { describe, test, expect } from "bun:test";
import type { IssueData, Comment, IssueImporter } from "../../../src/importers/types.js";

describe("IssueData interface", () => {
  test("IssueData has all required fields", () => {
    const data: IssueData = {
      title: "Fix authentication redirect loop",
      body: "The login page redirects back to itself after OAuth callback.",
      labels: ["bug", "p1"],
      comments: [],
      sourceUrl: "https://github.com/org/repo/issues/123",
    };

    expect(data.title).toBe("Fix authentication redirect loop");
    expect(data.body).toBe("The login page redirects back to itself after OAuth callback.");
    expect(data.labels).toEqual(["bug", "p1"]);
    expect(data.comments).toEqual([]);
    expect(data.sourceUrl).toBe("https://github.com/org/repo/issues/123");
  });

  test("IssueData with comments", () => {
    const comment: Comment = {
      author: "janedoe",
      date: "2024-01-15T10:30:00Z",
      body: "I can reproduce this on Chrome 120.",
      isBot: false,
    };

    const data: IssueData = {
      title: "Bug report",
      body: "Something is broken.",
      labels: [],
      comments: [comment],
      sourceUrl: "https://github.com/org/repo/issues/456",
    };

    expect(data.comments).toHaveLength(1);
    expect(data.comments[0].author).toBe("janedoe");
    expect(data.comments[0].date).toBe("2024-01-15T10:30:00Z");
    expect(data.comments[0].body).toBe("I can reproduce this on Chrome 120.");
    expect(data.comments[0].isBot).toBe(false);
  });

  test("Comment isBot field distinguishes bot comments", () => {
    const botComment: Comment = {
      author: "dependabot[bot]",
      date: "2024-01-15T10:30:00Z",
      body: "Automated security update.",
      isBot: true,
    };

    expect(botComment.isBot).toBe(true);
  });
});

describe("IssueImporter interface", () => {
  test("canHandle returns boolean for URL matching", () => {
    const importer: IssueImporter = {
      name: "github",
      canHandle(url: string): boolean {
        return url.includes("github.com");
      },
      async fetch(_url: string): Promise<IssueData> {
        return {
          title: "test",
          body: "test body",
          labels: [],
          comments: [],
          sourceUrl: _url,
        };
      },
    };

    expect(importer.canHandle("https://github.com/org/repo/issues/1")).toBe(true);
    expect(importer.canHandle("https://jira.atlassian.net/browse/PROJ-1")).toBe(false);
  });

  test("fetch returns IssueData", async () => {
    const importer: IssueImporter = {
      name: "test",
      canHandle: () => true,
      async fetch(url: string): Promise<IssueData> {
        return {
          title: "Test issue",
          body: "Test body",
          labels: ["enhancement"],
          comments: [],
          sourceUrl: url,
        };
      },
    };

    const data = await importer.fetch("https://example.com/issue/1");
    expect(data.title).toBe("Test issue");
    expect(data.labels).toEqual(["enhancement"]);
    expect(data.sourceUrl).toBe("https://example.com/issue/1");
  });
});
