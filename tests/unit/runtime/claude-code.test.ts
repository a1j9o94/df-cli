import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ClaudeCodeRuntime } from "../../../src/runtime/claude-code.js";

describe("ClaudeCodeRuntime", () => {
  let tempDir: string;
  let logsDir: string;

  beforeEach(() => {
    tempDir = join(
      tmpdir(),
      `df-test-runtime-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    logsDir = join(tempDir, "logs");
    mkdirSync(logsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("constructor and getLogsDir", () => {
    it("stores logsDir when provided", () => {
      const runtime = new ClaudeCodeRuntime("echo", logsDir);
      expect(runtime.getLogsDir()).toBe(logsDir);
    });

    it("constructs with default binary and no logsDir", () => {
      const defaultRuntime = new ClaudeCodeRuntime();
      expect(defaultRuntime.getLogsDir()).toBeUndefined();
    });

    it("constructs with custom binary and logsDir", () => {
      const withLogs = new ClaudeCodeRuntime("claude", logsDir);
      expect(withLogs.getLogsDir()).toBe(logsDir);
    });
  });

  describe("buildSpawnArgs", () => {
    it("does NOT add --output-format stream-json (disabled: causes early exit)", () => {
      // NOTE: --output-format stream-json is intentionally disabled in the runtime
      // because it was causing agents to exit immediately. When re-enabled, update
      // this test to assert the flags are present.
      const runtime = new ClaudeCodeRuntime("claude", logsDir);
      const args = runtime.buildSpawnArgs({
        agent_id: "agt_test",
        run_id: "run_test",
        role: "builder",
        name: "test-builder",
        system_prompt: "You are a test builder.",
      });

      expect(args).not.toContain("--output-format");
      expect(args).not.toContain("stream-json");
      expect(args).toContain("--print");
    });

    it("does NOT add --output-format when logsDir is not set", () => {
      const runtime = new ClaudeCodeRuntime("claude");
      const args = runtime.buildSpawnArgs({
        agent_id: "agt_test",
        run_id: "run_test",
        role: "builder",
        name: "test-builder",
        system_prompt: "You are a test builder.",
      });

      expect(args).not.toContain("--output-format");
      expect(args).not.toContain("stream-json");
      expect(args).toContain("--print");
    });

    it("includes standard flags: --print, --dangerously-skip-permissions, --system-prompt", () => {
      const runtime = new ClaudeCodeRuntime("claude", logsDir);
      const args = runtime.buildSpawnArgs({
        agent_id: "agt_test",
        run_id: "run_test",
        role: "builder",
        name: "test-builder",
        system_prompt: "Test prompt",
      });

      expect(args).toContain("--print");
      expect(args).toContain("--dangerously-skip-permissions");
      expect(args).toContain("--system-prompt");
    });
  });

  describe("getLogWriter", () => {
    it("returns an AgentLogWriter when logsDir is set", () => {
      const runtime = new ClaudeCodeRuntime("echo", logsDir);
      const writer = runtime.getLogWriter("agt_test123");

      expect(writer).toBeDefined();
      expect(writer?.logPath).toBe(join(logsDir, "agt_test123.jsonl"));
    });

    it("returns undefined when logsDir is not set", () => {
      const runtime = new ClaudeCodeRuntime("echo");
      const writer = runtime.getLogWriter("agt_test123");

      expect(writer).toBeUndefined();
    });
  });
});
