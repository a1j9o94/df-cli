import { describe, test, expect } from "bun:test";
import { formatModuleProgressInline } from "../../../src/utils/format-module-progress.js";
import type { ModuleProgressEntry } from "../../../src/db/queries/status-queries.js";

describe("formatModuleProgressInline", () => {
  test("formats done modules", () => {
    const entries: ModuleProgressEntry[] = [
      { moduleId: "parser", moduleTitle: "Parser", status: "completed", agentId: "a1", agentName: "b-parser", elapsedMs: 0, costUsd: 0.50 },
    ];
    const result = formatModuleProgressInline(entries);
    expect(result).toContain("parser(done)");
  });

  test("formats building modules with elapsed time", () => {
    const entries: ModuleProgressEntry[] = [
      { moduleId: "lexer", moduleTitle: "Lexer", status: "running", agentId: "a2", agentName: "b-lexer", elapsedMs: 754000, costUsd: 0.20 },
    ];
    const result = formatModuleProgressInline(entries);
    expect(result).toContain("lexer(building 12m 34s)");
  });

  test("formats pending modules", () => {
    const entries: ModuleProgressEntry[] = [
      { moduleId: "codegen", moduleTitle: "Code Generator", status: "pending", agentId: null, agentName: null, elapsedMs: 0, costUsd: 0 },
    ];
    const result = formatModuleProgressInline(entries);
    expect(result).toContain("codegen(pending)");
  });

  test("formats failed modules", () => {
    const entries: ModuleProgressEntry[] = [
      { moduleId: "runtime", moduleTitle: "Runtime", status: "failed", agentId: "a3", agentName: "b-runtime", elapsedMs: 0, costUsd: 0.10 },
    ];
    const result = formatModuleProgressInline(entries);
    expect(result).toContain("runtime(failed)");
  });

  test("formats multiple modules space-separated", () => {
    const entries: ModuleProgressEntry[] = [
      { moduleId: "parser", moduleTitle: "Parser", status: "completed", agentId: "a1", agentName: "b-parser", elapsedMs: 0, costUsd: 0.50 },
      { moduleId: "lexer", moduleTitle: "Lexer", status: "running", agentId: "a2", agentName: "b-lexer", elapsedMs: 60000, costUsd: 0.05 },
      { moduleId: "codegen", moduleTitle: "CodeGen", status: "pending", agentId: null, agentName: null, elapsedMs: 0, costUsd: 0 },
    ];
    const result = formatModuleProgressInline(entries);
    expect(result).toBe("parser(done) lexer(building 1m 0s) codegen(pending)");
  });

  test("returns empty string for empty array", () => {
    expect(formatModuleProgressInline([])).toBe("");
  });
});
