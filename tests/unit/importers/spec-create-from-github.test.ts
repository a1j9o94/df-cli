import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import { mkdirSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  importAndCreateSpec,
  type ImportSpecOptions,
} from "../../../src/importers/import-spec.js";
import type { IssueData } from "../../../src/importers/types.js";
import { ImporterRegistry } from "../../../src/importers/registry.js";

function createTmpDfDir(): string {
  const base = join(tmpdir(), `df-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const dfDir = join(base, ".df");
  mkdirSync(join(dfDir, "specs"), { recursive: true });
  return dfDir;
}

function createMockRegistry(issueData: IssueData): ImporterRegistry {
  const registry = new ImporterRegistry();
  registry.register({
    name: "github",
    canHandle: (url: string) => url.includes("github.com"),
    async fetch(url: string): Promise<IssueData> {
      return { ...issueData, sourceUrl: url };
    },
  });
  return registry;
}

const sampleIssue: IssueData = {
  title: "Fix authentication redirect loop",
  body: "## Description\n\nThe login page redirects.\n\n- [ ] Fix redirect\n- [ ] Add tests\n\n## Acceptance Criteria\n\n- [ ] Login works\n- [ ] No redirect loop",
  labels: ["bug", "p1"],
  comments: [
    {
      author: "reviewer",
      date: "2024-01-15T10:30:00Z",
      body: "Can reproduce.",
      isBot: false,
    },
  ],
  sourceUrl: "https://github.com/org/repo/issues/123",
};

describe("importAndCreateSpec", () => {
  let dfDir: string;

  beforeEach(() => {
    dfDir = createTmpDfDir();
  });

  test("creates a spec file from GitHub issue URL", async () => {
    const registry = createMockRegistry(sampleIssue);
    const result = await importAndCreateSpec({
      url: "https://github.com/org/repo/issues/123",
      dfDir,
      registry,
    });

    expect(result.specId).toMatch(/^spec_/);
    expect(result.filePath).toContain(".df/specs/");
    expect(result.title).toBe("Fix authentication redirect loop");
    expect(result.type).toBe("bug");
    expect(result.priority).toBe("high");
    expect(result.sourceUrl).toBe("https://github.com/org/repo/issues/123");
    expect(result.requirementsCount).toBe(2);
    expect(result.scenariosCount).toBe(2);
  });

  test("writes spec file to disk", async () => {
    const registry = createMockRegistry(sampleIssue);
    const result = await importAndCreateSpec({
      url: "https://github.com/org/repo/issues/123",
      dfDir,
      registry,
    });

    const absPath = join(dfDir, "specs", `${result.specId}.md`);
    expect(existsSync(absPath)).toBe(true);
    const content = readFileSync(absPath, "utf-8");
    expect(content).toContain("Fix authentication redirect loop");
    expect(content).toContain("source_url: https://github.com/org/repo/issues/123");
    expect(content).toContain("type: bug");
    expect(content).toContain("priority: high");
  });

  test("dry-run does not write file", async () => {
    const registry = createMockRegistry(sampleIssue);
    const result = await importAndCreateSpec({
      url: "https://github.com/org/repo/issues/123",
      dfDir,
      registry,
      dryRun: true,
    });

    const absPath = join(dfDir, "specs", `${result.specId}.md`);
    expect(existsSync(absPath)).toBe(false);
    expect(result.content).toBeDefined();
    expect(result.content).toContain("Fix authentication redirect loop");
  });

  test("returns spec content in dry-run mode", async () => {
    const registry = createMockRegistry(sampleIssue);
    const result = await importAndCreateSpec({
      url: "https://github.com/org/repo/issues/123",
      dfDir,
      registry,
      dryRun: true,
    });

    expect(result.content).toContain("---");
    expect(result.content).toContain("## Goal");
    expect(result.content).toContain("## Requirements");
  });

  test("throws for URL with no matching importer", async () => {
    const registry = createMockRegistry(sampleIssue);
    await expect(
      importAndCreateSpec({
        url: "https://trello.com/c/abc/card",
        dfDir,
        registry,
      }),
    ).rejects.toThrow(/No importer found/);
  });

  test("includes typeSource and prioritySource in result", async () => {
    const registry = createMockRegistry(sampleIssue);
    const result = await importAndCreateSpec({
      url: "https://github.com/org/repo/issues/123",
      dfDir,
      registry,
    });

    expect(result.typeSource).toBe("bug");
    expect(result.prioritySource).toBe("p1");
  });

  test("works with issue that has no labels", async () => {
    const issue: IssueData = {
      ...sampleIssue,
      labels: [],
    };
    const registry = createMockRegistry(issue);
    const result = await importAndCreateSpec({
      url: "https://github.com/org/repo/issues/1",
      dfDir,
      registry,
    });

    expect(result.type).toBe("feature");
    expect(result.priority).toBe("medium");
    expect(result.typeSource).toBeUndefined();
    expect(result.prioritySource).toBeUndefined();
  });

  test("works with unstructured issue body", async () => {
    const issue: IssueData = {
      ...sampleIssue,
      body: "Something is broken, please fix.",
      labels: [],
    };
    const registry = createMockRegistry(issue);
    const result = await importAndCreateSpec({
      url: "https://github.com/org/repo/issues/1",
      dfDir,
      registry,
    });

    expect(result.requirementsCount).toBe(0);
    expect(result.scenariosCount).toBe(0);
  });
});
