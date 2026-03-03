import { describe, test, expect } from "bun:test";
import { GitHubImporter } from "../../../src/importers/github.js";
import type { IssueImporter } from "../../../src/importers/types.js";

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

  describe("URL parsing", () => {
    test("extracts owner, repo, and issue number from URL", async () => {
      let capturedOwner = "";
      let capturedRepo = "";
      let capturedNumber = 0;

      const mockExec = async (cmd: string): Promise<string> => {
        if (cmd.includes("repos/")) {
          // Extract owner/repo/number from the API call
          const match = cmd.match(/repos\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
          if (match) {
            capturedOwner = match[1];
            capturedRepo = match[2];
            capturedNumber = Number.parseInt(match[3], 10);
          }
          if (cmd.includes("/comments")) {
            return "[]";
          }
          return JSON.stringify({
            title: "Test",
            body: "Body",
            labels: [],
            user: { login: "test" },
          });
        }
        return "";
      };

      const importer = new GitHubImporter(mockExec);
      await importer.fetch("https://github.com/my-org/my-repo/issues/42");

      expect(capturedOwner).toBe("my-org");
      expect(capturedRepo).toBe("my-repo");
      expect(capturedNumber).toBe(42);
    });

    test("throws on malformed GitHub URL during fetch", async () => {
      const importer = new GitHubImporter();
      expect(importer.fetch("https://github.com/bad-url")).rejects.toThrow();
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
