import { describe, test, expect } from "bun:test";
import { createDefaultRegistry } from "../../../src/importers/index.js";

describe("createDefaultRegistry", () => {
  test("returns a registry with github importer registered", () => {
    const registry = createDefaultRegistry();
    const names = registry.listImporters();
    expect(names).toContain("github");
  });

  test("github importer can handle GitHub URLs", () => {
    const registry = createDefaultRegistry();
    const importer = registry.resolve("https://github.com/org/repo/issues/1");
    expect(importer).not.toBeNull();
    expect(importer!.name).toBe("github");
  });

  test("returns null for unhandled URLs", () => {
    const registry = createDefaultRegistry();
    expect(registry.resolve("https://trello.com/c/abc123/my-card")).toBeNull();
  });

  test("includes stub importers for jira and linear", () => {
    const registry = createDefaultRegistry();
    const names = registry.listImporters();
    expect(names).toContain("jira");
    expect(names).toContain("linear");
  });

  test("jira stub canHandle returns true for jira URLs", () => {
    const registry = createDefaultRegistry();
    const importer = registry.resolve("https://mycompany.atlassian.net/browse/PROJ-123");
    expect(importer).not.toBeNull();
    expect(importer!.name).toBe("jira");
  });

  test("linear stub canHandle returns true for linear URLs", () => {
    const registry = createDefaultRegistry();
    const importer = registry.resolve("https://linear.app/team/issue/ABC-123");
    expect(importer).not.toBeNull();
    expect(importer!.name).toBe("linear");
  });

  test("jira stub fetch throws not implemented error", async () => {
    const registry = createDefaultRegistry();
    const importer = registry.resolve("https://mycompany.atlassian.net/browse/PROJ-123");
    await expect(
      importer!.fetch("https://mycompany.atlassian.net/browse/PROJ-123"),
    ).rejects.toThrow(/Not yet implemented/);
  });

  test("linear stub fetch throws not implemented error", async () => {
    const registry = createDefaultRegistry();
    const importer = registry.resolve("https://linear.app/team/issue/ABC-123");
    await expect(
      importer!.fetch("https://linear.app/team/issue/ABC-123"),
    ).rejects.toThrow(/Not yet implemented/);
  });
});
