import { describe, test, expect } from "bun:test";
import { formatImportSummary } from "../../../src/importers/format-summary.js";
import type { ImportSpecResult } from "../../../src/importers/import-spec.js";

describe("formatImportSummary", () => {
  const baseResult: ImportSpecResult = {
    specId: "spec_01KJP123",
    filePath: ".df/specs/spec_01KJP123.md",
    title: "Fix authentication redirect loop",
    type: "bug",
    priority: "high",
    sourceUrl: "https://github.com/org/repo/issues/123",
    requirementsCount: 4,
    scenariosCount: 2,
    typeSource: "bug",
    prioritySource: "p1",
    content: "---\n...",
  };

  test("includes spec file path", () => {
    const summary = formatImportSummary(baseResult);
    expect(summary).toContain("Created spec: .df/specs/spec_01KJP123.md");
  });

  test("includes title", () => {
    const summary = formatImportSummary(baseResult);
    expect(summary).toContain("Title: Fix authentication redirect loop");
  });

  test("includes type with source label", () => {
    const summary = formatImportSummary(baseResult);
    expect(summary).toContain("Type: bug (from label: bug)");
  });

  test("includes priority with source label", () => {
    const summary = formatImportSummary(baseResult);
    expect(summary).toContain("Priority: high (from label: p1)");
  });

  test("includes source URL", () => {
    const summary = formatImportSummary(baseResult);
    expect(summary).toContain("Source: https://github.com/org/repo/issues/123");
  });

  test("includes requirements count", () => {
    const summary = formatImportSummary(baseResult);
    expect(summary).toContain("Requirements: 4 extracted");
  });

  test("includes scenarios count", () => {
    const summary = formatImportSummary(baseResult);
    expect(summary).toContain("Scenarios: 2 extracted from acceptance criteria");
  });

  test("shows 'default' when no type source label", () => {
    const result = { ...baseResult, typeSource: undefined };
    const summary = formatImportSummary(result);
    expect(summary).toContain("Type: bug (default)");
  });

  test("shows 'default' when no priority source label", () => {
    const result = { ...baseResult, prioritySource: undefined };
    const summary = formatImportSummary(result);
    expect(summary).toContain("Priority: high (default)");
  });

  test("includes edit and build hints", () => {
    const summary = formatImportSummary(baseResult);
    expect(summary).toContain("Review and edit:");
    expect(summary).toContain("Build when ready:");
  });

  test("shows 0 for requirements when none extracted", () => {
    const result = { ...baseResult, requirementsCount: 0 };
    const summary = formatImportSummary(result);
    expect(summary).toContain("Requirements: 0 extracted");
  });
});
