import { describe, expect, it } from "bun:test";
import { ClaudeCodeRuntime } from "../../../src/runtime/claude-code.js";

describe("ClaudeCodeRuntime", () => {
  describe("constructor", () => {
    it("constructs with default binary", () => {
      const runtime = new ClaudeCodeRuntime();
      expect(runtime).toBeDefined();
    });

    it("constructs with custom binary", () => {
      const runtime = new ClaudeCodeRuntime("echo");
      expect(runtime).toBeDefined();
    });
  });

  describe("buildSpawnArgs", () => {
    it("includes --output-format json for result capture", () => {
      const runtime = new ClaudeCodeRuntime("claude");
      const args = runtime.buildSpawnArgs({
        agent_id: "agt_test",
        run_id: "run_test",
        role: "builder",
        name: "test-builder",
        system_prompt: "You are a test builder.",
      });

      expect(args).toContain("--output-format");
      expect(args).toContain("json");
      expect(args).toContain("--print");
      expect(args).toContain("--dangerously-skip-permissions");
    });

    it("includes --system-prompt for new sessions", () => {
      const runtime = new ClaudeCodeRuntime("claude");
      const args = runtime.buildSpawnArgs({
        agent_id: "agt_test",
        run_id: "run_test",
        role: "builder",
        name: "test-builder",
        system_prompt: "Test prompt",
      });

      expect(args).toContain("--system-prompt");
      expect(args).toContain("Test prompt");
      expect(args).not.toContain("--resume");
    });

    it("uses --resume for session continuations", () => {
      const runtime = new ClaudeCodeRuntime("claude");
      const args = runtime.buildSpawnArgs({
        agent_id: "agt_test",
        run_id: "run_test",
        role: "builder",
        name: "test-builder",
        system_prompt: "Test prompt",
        resume_session_id: "session-abc-123",
      });

      expect(args).toContain("--resume");
      expect(args).toContain("session-abc-123");
      expect(args).not.toContain("--system-prompt");
    });
  });
});
