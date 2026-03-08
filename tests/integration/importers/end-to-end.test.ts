import { describe, test, expect, beforeEach } from "bun:test";
import { mkdirSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { importAndCreateSpec } from "../../../src/importers/import-spec.js";
import { ImporterRegistry } from "../../../src/importers/registry.js";
import { GitHubIssueImporter } from "../../../src/importers/github/importer.js";
import { GitHubImporter, type ExecFn } from "../../../src/importers/github.js";
import { createDefaultRegistry } from "../../../src/importers/index.js";
import { generateSpecFromIssue } from "../../../src/importers/spec-generator.js";
import { mapLabels } from "../../../src/importers/label-mapper.js";
import { formatImportSummary } from "../../../src/importers/format-summary.js";
import { parseFrontmatter } from "../../../src/utils/frontmatter.js";
import type { IssueData, IssueImporter } from "../../../src/importers/types.js";

function createTmpDfDir(): string {
  const base = join(
    tmpdir(),
    `df-integ-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const dfDir = join(base, ".df");
  mkdirSync(join(dfDir, "specs"), { recursive: true });
  return dfDir;
}

/**
 * Create a mock exec function that simulates gh CLI responses.
 */
function createMockExec(
  issueResponse: object,
  commentsResponse: object[] = [],
): ExecFn {
  return async (cmd: string): Promise<string> => {
    if (cmd === "gh --version") {
      return "gh version 2.40.0 (2024-01-01)";
    }
    if (cmd.includes("/comments")) {
      return JSON.stringify(commentsResponse);
    }
    if (cmd.includes("gh api repos/")) {
      return JSON.stringify(issueResponse);
    }
    throw new Error(`Unexpected command: ${cmd}`);
  };
}

describe("Importer End-to-End Integration Tests", () => {
  let dfDir: string;

  beforeEach(() => {
    dfDir = createTmpDfDir();
  });

  describe("Full pipeline: GitHub URL → spec file on disk", () => {
    test("imports a public issue with structured body and writes a complete spec", async () => {
      const mockExec = createMockExec(
        {
          title: "Add rate limiting to API endpoints",
          body: "## Description\n\nWe need rate limiting to prevent abuse.\n\n- [ ] Implement token bucket algorithm\n- [ ] Add rate limit headers\n- [ ] Return 429 when exceeded\n\n## Acceptance Criteria\n\n- [ ] Rate limit of 100 req/min per API key\n- [ ] 429 response includes Retry-After header\n- [ ] Rate limits configurable per plan",
          labels: [{ name: "enhancement" }, { name: "p1" }],
          user: { login: "author" },
        },
        [
          {
            user: { login: "reviewer", type: "User" },
            created_at: "2024-06-15T14:30:00Z",
            body: "This should also include burst allowance.",
          },
        ],
      );

      const importer = new GitHubImporter(mockExec);
      const registry = new ImporterRegistry();
      registry.register(importer);

      const result = await importAndCreateSpec({
        url: "https://github.com/org/api-service/issues/42",
        dfDir,
        registry,
      });

      // Verify result metadata
      expect(result.specId).toMatch(/^spec_/);
      expect(result.title).toBe("Add rate limiting to API endpoints");
      expect(result.type).toBe("feature");
      expect(result.priority).toBe("high");
      expect(result.sourceUrl).toBe(
        "https://github.com/org/api-service/issues/42",
      );
      expect(result.requirementsCount).toBe(3);
      expect(result.scenariosCount).toBe(3);
      expect(result.typeSource).toBe("enhancement");
      expect(result.prioritySource).toBe("p1");

      // Verify file was written to disk
      const absPath = join(dfDir, "specs", `${result.specId}.md`);
      expect(existsSync(absPath)).toBe(true);

      // Verify file content has correct frontmatter
      const content = readFileSync(absPath, "utf-8");
      const { data, body } = parseFrontmatter(content);
      expect(data.id).toBe(result.specId);
      expect(data.title).toBe("Add rate limiting to API endpoints");
      expect(data.type).toBe("feature");
      expect(data.priority).toBe("high");
      expect(data.status).toBe("draft");
      expect(data.source_url).toBe(
        "https://github.com/org/api-service/issues/42",
      );

      // Verify body structure
      expect(body).toContain("# Add rate limiting to API endpoints");
      expect(body).toContain("## Goal");
      expect(body).toContain("rate limiting to prevent abuse");
      expect(body).toContain("## Requirements");
      expect(body).toContain("Implement token bucket algorithm");
      expect(body).toContain("Add rate limit headers");
      expect(body).toContain("Return 429 when exceeded");
      expect(body).toContain("## Scenarios");
      expect(body).toContain("### Functional");
      expect(body).toContain("Rate limit of 100 req/min per API key");
      expect(body).toContain("## Context from Discussion");
      expect(body).toContain("burst allowance");
    });

    test("imports issue with bug label and critical priority", async () => {
      const mockExec = createMockExec({
        title: "Login fails on Safari",
        body: "Users report 500 error on Safari.\n\n- [ ] Debug Safari auth flow\n- [ ] Fix cookie handling",
        labels: [{ name: "bug" }, { name: "p0" }],
        user: { login: "reporter" },
      });

      const importer = new GitHubImporter(mockExec);
      const registry = new ImporterRegistry();
      registry.register(importer);

      const result = await importAndCreateSpec({
        url: "https://github.com/org/app/issues/99",
        dfDir,
        registry,
      });

      expect(result.type).toBe("bug");
      expect(result.priority).toBe("critical");
      expect(result.typeSource).toBe("bug");
      expect(result.prioritySource).toBe("p0");

      // Verify on disk
      const content = readFileSync(
        join(dfDir, "specs", `${result.specId}.md`),
        "utf-8",
      );
      expect(content).toContain("type: bug");
      expect(content).toContain("priority: critical");
    });

    test("source URL is preserved in frontmatter", async () => {
      const url = "https://github.com/myorg/myrepo/issues/777";
      const mockExec = createMockExec({
        title: "Test issue",
        body: "Test body",
        labels: [],
        user: { login: "author" },
      });

      const importer = new GitHubImporter(mockExec);
      const registry = new ImporterRegistry();
      registry.register(importer);

      const result = await importAndCreateSpec({
        url,
        dfDir,
        registry,
      });

      expect(result.sourceUrl).toBe(url);

      const content = readFileSync(
        join(dfDir, "specs", `${result.specId}.md`),
        "utf-8",
      );
      const { data } = parseFrontmatter(content);
      expect(data.source_url).toBe(url);
    });
  });

  describe("Dry-run mode", () => {
    test("dry-run produces content but does not write file", async () => {
      const mockExec = createMockExec({
        title: "Dry run test",
        body: "This should not be written.\n\n- [ ] Requirement A",
        labels: [{ name: "feature" }],
        user: { login: "author" },
      });

      const importer = new GitHubImporter(mockExec);
      const registry = new ImporterRegistry();
      registry.register(importer);

      const result = await importAndCreateSpec({
        url: "https://github.com/org/repo/issues/1",
        dfDir,
        registry,
        dryRun: true,
      });

      // Content should be generated
      expect(result.content).toContain("# Dry run test");
      expect(result.content).toContain("## Goal");
      expect(result.content).toContain("## Requirements");
      expect(result.content).toContain("Requirement A");

      // File should NOT exist
      const absPath = join(dfDir, "specs", `${result.specId}.md`);
      expect(existsSync(absPath)).toBe(false);
    });
  });

  describe("Unstructured issue body", () => {
    test("plain text body becomes Goal, requirements and scenarios are placeholders", async () => {
      const mockExec = createMockExec({
        title: "Something is broken",
        body: "The app crashes when I click the submit button. No error message shown.",
        labels: [],
        user: { login: "user" },
      });

      const importer = new GitHubImporter(mockExec);
      const registry = new ImporterRegistry();
      registry.register(importer);

      const result = await importAndCreateSpec({
        url: "https://github.com/org/repo/issues/55",
        dfDir,
        registry,
      });

      expect(result.requirementsCount).toBe(0);
      expect(result.scenariosCount).toBe(0);
      expect(result.type).toBe("feature"); // default
      expect(result.priority).toBe("medium"); // default

      const content = readFileSync(
        join(dfDir, "specs", `${result.specId}.md`),
        "utf-8",
      );
      expect(content).toContain("## Goal");
      expect(content).toContain("crashes when I click the submit button");
      expect(content).toContain("TODO: Extract requirements");
      expect(content).toContain("TODO");
    });
  });

  describe("GitHub CLI check", () => {
    test("missing gh CLI produces clear error message", async () => {
      const failExec: ExecFn = async (cmd: string) => {
        if (cmd === "gh --version") {
          throw new Error("command not found: gh");
        }
        throw new Error(`Unexpected command: ${cmd}`);
      };

      const importer = new GitHubImporter(failExec);
      const registry = new ImporterRegistry();
      registry.register(importer);

      await expect(
        importAndCreateSpec({
          url: "https://github.com/org/repo/issues/1",
          dfDir,
          registry,
        }),
      ).rejects.toThrow(/GitHub CLI.*required/i);
    });
  });

  describe("Comment extraction through full pipeline", () => {
    test("non-bot comments appear in Context from Discussion section", async () => {
      const mockExec = createMockExec(
        {
          title: "Issue with comments",
          body: "Description of the issue.",
          labels: [],
          user: { login: "author" },
        },
        [
          {
            user: { login: "alice", type: "User" },
            created_at: "2024-01-10T10:00:00Z",
            body: "I can reproduce this on my machine too.",
          },
          {
            user: { login: "dependabot[bot]", type: "Bot" },
            created_at: "2024-01-11T10:00:00Z",
            body: "Bump version to 1.2.3",
          },
          {
            user: { login: "bob", type: "User" },
            created_at: "2024-01-12T10:00:00Z",
            body: "Fixed in PR #456",
          },
        ],
      );

      const importer = new GitHubImporter(mockExec);
      const registry = new ImporterRegistry();
      registry.register(importer);

      const result = await importAndCreateSpec({
        url: "https://github.com/org/repo/issues/10",
        dfDir,
        registry,
      });

      const content = readFileSync(
        join(dfDir, "specs", `${result.specId}.md`),
        "utf-8",
      );

      // Non-bot comments should appear
      expect(content).toContain("Context from Discussion");
      expect(content).toContain("alice");
      expect(content).toContain("reproduce this on my machine");
      expect(content).toContain("bob");
      expect(content).toContain("Fixed in PR #456");

      // Bot comments should NOT appear
      expect(content).not.toContain("dependabot");
      expect(content).not.toContain("Bump version");
    });

    test("long comments are truncated", async () => {
      const longBody = "A".repeat(600);
      const mockExec = createMockExec(
        {
          title: "Long comment test",
          body: "Description.",
          labels: [],
          user: { login: "author" },
        },
        [
          {
            user: { login: "verbose-reviewer", type: "User" },
            created_at: "2024-01-10T10:00:00Z",
            body: longBody,
          },
        ],
      );

      const importer = new GitHubImporter(mockExec);
      const registry = new ImporterRegistry();
      registry.register(importer);

      const result = await importAndCreateSpec({
        url: "https://github.com/org/repo/issues/11",
        dfDir,
        registry,
      });

      const content = readFileSync(
        join(dfDir, "specs", `${result.specId}.md`),
        "utf-8",
      );

      // The comment should be truncated (not contain the full 600 chars)
      expect(content).toContain("verbose-reviewer");
      expect(content).not.toContain(longBody);
      expect(content).toContain("...");
    });
  });

  describe("Registry and importer resolution", () => {
    test("default registry resolves GitHub URLs", () => {
      const registry = createDefaultRegistry();
      const importer = registry.resolve(
        "https://github.com/org/repo/issues/1",
      );
      expect(importer).not.toBeNull();
      expect(importer!.name).toBe("github");
    });

    test("default registry resolves Jira URLs (stub)", () => {
      const registry = createDefaultRegistry();
      const importer = registry.resolve(
        "https://mycompany.atlassian.net/browse/PROJ-123",
      );
      expect(importer).not.toBeNull();
      expect(importer!.name).toBe("jira");
    });

    test("default registry resolves Linear URLs (stub)", () => {
      const registry = createDefaultRegistry();
      const importer = registry.resolve(
        "https://linear.app/team/issue/TEAM-456",
      );
      expect(importer).not.toBeNull();
      expect(importer!.name).toBe("linear");
    });

    test("Jira stub throws not-yet-implemented on fetch", async () => {
      const registry = createDefaultRegistry();
      const importer = registry.resolve(
        "https://mycompany.atlassian.net/browse/PROJ-123",
      )!;
      await expect(
        importer.fetch("https://mycompany.atlassian.net/browse/PROJ-123"),
      ).rejects.toThrow(/Not yet implemented/);
    });

    test("Linear stub throws not-yet-implemented on fetch", async () => {
      const registry = createDefaultRegistry();
      const importer = registry.resolve(
        "https://linear.app/team/issue/TEAM-456",
      )!;
      await expect(
        importer.fetch("https://linear.app/team/issue/TEAM-456"),
      ).rejects.toThrow(/Not yet implemented/);
    });

    test("unknown URL returns null from registry", () => {
      const registry = createDefaultRegistry();
      const importer = registry.resolve("https://trello.com/c/abc/card");
      expect(importer).toBeNull();
    });

    test("importAndCreateSpec throws for unresolvable URL", async () => {
      const registry = createDefaultRegistry();
      await expect(
        importAndCreateSpec({
          url: "https://trello.com/c/abc/card",
          dfDir,
          registry,
        }),
      ).rejects.toThrow(/No importer found/);
    });

    test("adding a new importer requires only register and canHandle/fetch", () => {
      const registry = new ImporterRegistry();

      // Custom importer following the IssueImporter interface
      const customImporter: IssueImporter = {
        name: "custom-tracker",
        canHandle(url: string) {
          return url.includes("custom-tracker.com");
        },
        async fetch(url: string): Promise<IssueData> {
          return {
            title: "Custom Issue",
            body: "Body from custom tracker",
            labels: ["bug"],
            comments: [],
            sourceUrl: url,
          };
        },
      };

      registry.register(customImporter);
      expect(registry.resolve("https://custom-tracker.com/issue/1")).toBe(
        customImporter,
      );
      expect(
        registry.resolve("https://github.com/org/repo/issues/1"),
      ).toBeNull();
    });
  });

  describe("Format summary integration", () => {
    test("full pipeline result produces correct summary string", async () => {
      const mockExec = createMockExec({
        title: "Fix auth redirect loop",
        body: "## Description\n\nRedirect loop on login.\n\n- [ ] Fix redirect\n- [ ] Add test\n\n## Acceptance Criteria\n\n- [ ] Login works\n- [ ] No loop",
        labels: [{ name: "bug" }, { name: "p1" }],
        user: { login: "reporter" },
      });

      const importer = new GitHubImporter(mockExec);
      const registry = new ImporterRegistry();
      registry.register(importer);

      const result = await importAndCreateSpec({
        url: "https://github.com/org/repo/issues/123",
        dfDir,
        registry,
      });

      const summary = formatImportSummary(result);
      expect(summary).toContain("Created spec:");
      expect(summary).toContain("Title: Fix auth redirect loop");
      expect(summary).toContain("Type: bug (from label: bug)");
      expect(summary).toContain("Priority: high (from label: p1)");
      expect(summary).toContain(
        "Source: https://github.com/org/repo/issues/123",
      );
      expect(summary).toContain("Requirements: 2 extracted");
      expect(summary).toContain("Scenarios: 2 extracted");
      expect(summary).toContain("Review and edit:");
      expect(summary).toContain("Build when ready:");
    });
  });

  describe("Label mapping through full pipeline", () => {
    const labelTestCases = [
      {
        labels: ["bug"],
        expectedType: "bug",
        expectedPriority: "medium",
      },
      {
        labels: ["bugfix"],
        expectedType: "bug",
        expectedPriority: "medium",
      },
      {
        labels: ["defect"],
        expectedType: "bug",
        expectedPriority: "medium",
      },
      {
        labels: ["enhancement"],
        expectedType: "feature",
        expectedPriority: "medium",
      },
      {
        labels: ["feature-request"],
        expectedType: "feature",
        expectedPriority: "medium",
      },
      {
        labels: ["p0"],
        expectedType: "feature",
        expectedPriority: "critical",
      },
      {
        labels: ["critical"],
        expectedType: "feature",
        expectedPriority: "critical",
      },
      {
        labels: ["urgent"],
        expectedType: "feature",
        expectedPriority: "critical",
      },
      {
        labels: ["p1"],
        expectedType: "feature",
        expectedPriority: "high",
      },
      {
        labels: ["p2"],
        expectedType: "feature",
        expectedPriority: "medium",
      },
      {
        labels: ["p3"],
        expectedType: "feature",
        expectedPriority: "low",
      },
      {
        labels: ["unknown-label", "not-mapped"],
        expectedType: "feature",
        expectedPriority: "medium",
      },
    ];

    for (const tc of labelTestCases) {
      test(`labels [${tc.labels.join(", ")}] → type=${tc.expectedType}, priority=${tc.expectedPriority}`, async () => {
        const mockExec = createMockExec({
          title: "Label test",
          body: "Body",
          labels: tc.labels.map((name) => ({ name })),
          user: { login: "author" },
        });

        const importer = new GitHubImporter(mockExec);
        const registry = new ImporterRegistry();
        registry.register(importer);

        const result = await importAndCreateSpec({
          url: "https://github.com/org/repo/issues/1",
          dfDir,
          registry,
        });

        expect(result.type).toBe(tc.expectedType);
        expect(result.priority).toBe(tc.expectedPriority);
      });
    }
  });

  describe("Acceptance criteria extraction through pipeline", () => {
    test("checkbox items under Acceptance Criteria become scenarios", async () => {
      const mockExec = createMockExec({
        title: "Feature with AC",
        body: "## Description\n\nNew feature.\n\n## Acceptance Criteria\n\n- [ ] User can sign up\n- [ ] User receives email\n- [ ] User can log in after signup",
        labels: [{ name: "enhancement" }],
        user: { login: "pm" },
      });

      const importer = new GitHubImporter(mockExec);
      const registry = new ImporterRegistry();
      registry.register(importer);

      const result = await importAndCreateSpec({
        url: "https://github.com/org/repo/issues/200",
        dfDir,
        registry,
      });

      expect(result.scenariosCount).toBe(3);

      const content = readFileSync(
        join(dfDir, "specs", `${result.specId}.md`),
        "utf-8",
      );
      expect(content).toContain("User can sign up");
      expect(content).toContain("User receives email");
      expect(content).toContain("User can log in after signup");
    });

    test("Test Cases section items also become scenarios", async () => {
      const mockExec = createMockExec({
        title: "Feature with test cases",
        body: "## Description\n\nAnother feature.\n\n## Test Cases\n\n- [ ] Verify success path\n- [ ] Verify error handling",
        labels: [],
        user: { login: "pm" },
      });

      const importer = new GitHubImporter(mockExec);
      const registry = new ImporterRegistry();
      registry.register(importer);

      const result = await importAndCreateSpec({
        url: "https://github.com/org/repo/issues/201",
        dfDir,
        registry,
      });

      expect(result.scenariosCount).toBe(2);
    });
  });

  describe("Issue with null body", () => {
    test("handles null body gracefully", async () => {
      const mockExec = createMockExec({
        title: "Issue with no body",
        body: null,
        labels: [],
        user: { login: "author" },
      });

      const importer = new GitHubImporter(mockExec);
      const registry = new ImporterRegistry();
      registry.register(importer);

      const result = await importAndCreateSpec({
        url: "https://github.com/org/repo/issues/300",
        dfDir,
        registry,
      });

      expect(result.title).toBe("Issue with no body");
      expect(result.requirementsCount).toBe(0);
      expect(result.scenariosCount).toBe(0);

      // File should still be written
      const absPath = join(dfDir, "specs", `${result.specId}.md`);
      expect(existsSync(absPath)).toBe(true);
    });
  });

  describe("Duplicate importer registration", () => {
    test("registering same name twice throws", () => {
      const registry = new ImporterRegistry();
      const importer1: IssueImporter = {
        name: "github",
        canHandle: () => true,
        fetch: async () => ({
          title: "",
          body: "",
          labels: [],
          comments: [],
          sourceUrl: "",
        }),
      };
      const importer2: IssueImporter = {
        name: "github",
        canHandle: () => true,
        fetch: async () => ({
          title: "",
          body: "",
          labels: [],
          comments: [],
          sourceUrl: "",
        }),
      };

      registry.register(importer1);
      expect(() => registry.register(importer2)).toThrow(/already registered/);
    });
  });
});
