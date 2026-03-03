import { describe, test, expect, beforeEach } from "bun:test";
import { ImporterRegistry } from "../../../src/importers/registry.js";
import type { IssueImporter, IssueData } from "../../../src/importers/types.js";

function createMockImporter(name: string, urlPattern: string): IssueImporter {
  return {
    name,
    canHandle(url: string): boolean {
      return url.includes(urlPattern);
    },
    async fetch(url: string): Promise<IssueData> {
      return {
        title: `${name} issue`,
        body: "body",
        labels: [],
        comments: [],
        sourceUrl: url,
      };
    },
  };
}

describe("ImporterRegistry", () => {
  let registry: ImporterRegistry;

  beforeEach(() => {
    registry = new ImporterRegistry();
  });

  test("starts empty", () => {
    expect(registry.listImporters()).toEqual([]);
  });

  test("register adds an importer", () => {
    const gh = createMockImporter("github", "github.com");
    registry.register(gh);
    expect(registry.listImporters()).toHaveLength(1);
    expect(registry.listImporters()[0]).toBe("github");
  });

  test("register multiple importers", () => {
    registry.register(createMockImporter("github", "github.com"));
    registry.register(createMockImporter("jira", "jira.atlassian.net"));
    expect(registry.listImporters()).toHaveLength(2);
    expect(registry.listImporters()).toContain("github");
    expect(registry.listImporters()).toContain("jira");
  });

  test("register rejects duplicate names", () => {
    registry.register(createMockImporter("github", "github.com"));
    expect(() => {
      registry.register(createMockImporter("github", "github.com"));
    }).toThrow(/already registered/);
  });

  test("resolve finds the right importer for a URL", () => {
    const gh = createMockImporter("github", "github.com");
    const jira = createMockImporter("jira", "jira.atlassian.net");
    registry.register(gh);
    registry.register(jira);

    const resolved = registry.resolve("https://github.com/org/repo/issues/1");
    expect(resolved).toBe(gh);
  });

  test("resolve returns null for unhandled URL", () => {
    registry.register(createMockImporter("github", "github.com"));
    const resolved = registry.resolve("https://linear.app/team/issue/123");
    expect(resolved).toBeNull();
  });

  test("resolve returns first matching importer", () => {
    // Both can handle github.com but first registered wins
    const gh1 = createMockImporter("github-v1", "github.com");
    const gh2 = createMockImporter("github-v2", "github.com");
    registry.register(gh1);
    registry.register(gh2);

    const resolved = registry.resolve("https://github.com/org/repo/issues/1");
    expect(resolved).toBe(gh1);
  });

  test("getImporter returns a specific importer by name", () => {
    const gh = createMockImporter("github", "github.com");
    registry.register(gh);

    expect(registry.getImporter("github")).toBe(gh);
    expect(registry.getImporter("jira")).toBeNull();
  });
});
