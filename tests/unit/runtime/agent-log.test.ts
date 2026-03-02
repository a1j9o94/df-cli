import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AgentLogWriter,
  type StreamJsonEvent,
  getAgentDiagnostics,
  getAgentLogPath,
  getLastToolCall,
  getLogsDir,
  getTokenUsage,
  parseAgentLog,
} from "../../../src/runtime/agent-log.js";

describe("AgentLogWriter", () => {
  let tempDir: string;
  let logsDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `df-test-logs-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    logsDir = join(tempDir, "logs");
    mkdirSync(logsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates a log file at the expected path", () => {
    const writer = new AgentLogWriter(logsDir, "agt_test123");
    expect(writer.logPath).toBe(join(logsDir, "agt_test123.jsonl"));
  });

  it("writes stream-json events as JSONL lines", () => {
    const writer = new AgentLogWriter(logsDir, "agt_test123");

    const event: StreamJsonEvent = {
      type: "assistant",
      subtype: "text",
      message: "Hello world",
      timestamp: "2026-03-01T00:00:00Z",
    };

    writer.write(event);
    writer.close();

    const content = readFileSync(writer.logPath, "utf-8").trim();
    const parsed = JSON.parse(content);
    expect(parsed.type).toBe("assistant");
    expect(parsed.message).toBe("Hello world");
  });

  it("appends multiple events on separate lines", () => {
    const writer = new AgentLogWriter(logsDir, "agt_test123");

    writer.write({
      type: "system",
      subtype: "init",
      message: "Starting",
      timestamp: "2026-03-01T00:00:00Z",
    });
    writer.write({
      type: "assistant",
      subtype: "text",
      message: "Working",
      timestamp: "2026-03-01T00:00:01Z",
    });
    writer.write({
      type: "result",
      subtype: "success",
      message: "Done",
      timestamp: "2026-03-01T00:00:02Z",
    });
    writer.close();

    const lines = readFileSync(writer.logPath, "utf-8").trim().split("\n");
    expect(lines.length).toBe(3);
    expect(JSON.parse(lines[0]).type).toBe("system");
    expect(JSON.parse(lines[1]).type).toBe("assistant");
    expect(JSON.parse(lines[2]).type).toBe("result");
  });

  it("creates the log file even if the directory does not exist yet", () => {
    const deepDir = join(tempDir, "nested", "logs");
    const writer = new AgentLogWriter(deepDir, "agt_deep");

    writer.write({
      type: "system",
      subtype: "init",
      message: "test",
      timestamp: "2026-03-01T00:00:00Z",
    });
    writer.close();

    expect(existsSync(writer.logPath)).toBe(true);
  });

  it("handles raw line writing for piped stdout", () => {
    const writer = new AgentLogWriter(logsDir, "agt_raw");

    writer.writeLine('{"type":"assistant","subtype":"text","message":"raw line"}');
    writer.writeLine('{"type":"result","subtype":"success","cost_usd":0.05}');
    writer.close();

    const lines = readFileSync(writer.logPath, "utf-8").trim().split("\n");
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0]).type).toBe("assistant");
    expect(JSON.parse(lines[1]).cost_usd).toBe(0.05);
  });

  it("close is safe to call multiple times", () => {
    const writer = new AgentLogWriter(logsDir, "agt_close");
    writer.write({ type: "system", subtype: "init" });
    writer.close();
    writer.close(); // should not throw
  });
});

describe("parseAgentLog", () => {
  let tempDir: string;
  let logsDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `df-test-logs-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    logsDir = join(tempDir, "logs");
    mkdirSync(logsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("parses a JSONL log file into an array of events", () => {
    const writer = new AgentLogWriter(logsDir, "agt_parse");
    writer.write({
      type: "system",
      subtype: "init",
      message: "Starting",
      timestamp: "2026-03-01T00:00:00Z",
    });
    writer.write({
      type: "assistant",
      subtype: "text",
      message: "Done",
      timestamp: "2026-03-01T00:00:01Z",
    });
    writer.close();

    const events = parseAgentLog(writer.logPath);
    expect(events.length).toBe(2);
    expect(events[0].type).toBe("system");
    expect(events[1].type).toBe("assistant");
  });

  it("returns empty array for non-existent file", () => {
    const events = parseAgentLog(join(logsDir, "nonexistent.jsonl"));
    expect(events.length).toBe(0);
  });

  it("skips malformed lines gracefully", () => {
    const writer = new AgentLogWriter(logsDir, "agt_malformed");
    writer.writeLine('{"type":"system","subtype":"init","message":"ok"}');
    writer.writeLine("not valid json");
    writer.writeLine('{"type":"assistant","subtype":"text","message":"also ok"}');
    writer.close();

    const events = parseAgentLog(writer.logPath);
    expect(events.length).toBe(2);
    expect(events[0].type).toBe("system");
    expect(events[1].type).toBe("assistant");
  });
});

describe("getLastToolCall", () => {
  it("extracts the last tool_use event from a log", () => {
    const events: StreamJsonEvent[] = [
      {
        type: "assistant",
        subtype: "text",
        message: "Let me read the file",
        timestamp: "2026-03-01T00:00:00Z",
      },
      {
        type: "assistant",
        subtype: "tool_use",
        tool_name: "Read",
        tool_input: { file_path: "/foo/bar.ts" },
        timestamp: "2026-03-01T00:00:01Z",
      },
      {
        type: "assistant",
        subtype: "tool_use",
        tool_name: "Edit",
        tool_input: { file_path: "/foo/bar.ts", old_string: "a", new_string: "b" },
        timestamp: "2026-03-01T00:00:02Z",
      },
      {
        type: "assistant",
        subtype: "text",
        message: "Now testing",
        timestamp: "2026-03-01T00:00:03Z",
      },
    ];

    const last = getLastToolCall(events);
    expect(last).toBeDefined();
    expect(last?.tool_name).toBe("Edit");
    expect(last?.tool_input?.file_path).toBe("/foo/bar.ts");
  });

  it("returns undefined when no tool calls exist", () => {
    const events: StreamJsonEvent[] = [
      { type: "assistant", subtype: "text", message: "Hello", timestamp: "2026-03-01T00:00:00Z" },
    ];

    const last = getLastToolCall(events);
    expect(last).toBeUndefined();
  });
});

describe("getTokenUsage", () => {
  it("extracts token usage from result events", () => {
    const events: StreamJsonEvent[] = [
      {
        type: "assistant",
        subtype: "text",
        message: "Working...",
        timestamp: "2026-03-01T00:00:00Z",
      },
      {
        type: "result",
        subtype: "success",
        message: "Done",
        timestamp: "2026-03-01T00:00:01Z",
        cost_usd: 0.15,
        tokens_used: 50000,
        duration_ms: 120000,
      },
    ];

    const usage = getTokenUsage(events);
    expect(usage.cost_usd).toBe(0.15);
    expect(usage.tokens_used).toBe(50000);
    expect(usage.duration_ms).toBe(120000);
  });

  it("returns zeros when no result event exists", () => {
    const events: StreamJsonEvent[] = [
      {
        type: "assistant",
        subtype: "text",
        message: "Crashed mid-way",
        timestamp: "2026-03-01T00:00:00Z",
      },
    ];

    const usage = getTokenUsage(events);
    expect(usage.cost_usd).toBe(0);
    expect(usage.tokens_used).toBe(0);
    expect(usage.duration_ms).toBe(0);
  });

  it("accumulates from multiple result events", () => {
    const events: StreamJsonEvent[] = [
      {
        type: "result",
        subtype: "partial",
        cost_usd: 0.05,
        tokens_used: 10000,
        duration_ms: 30000,
        timestamp: "2026-03-01T00:00:00Z",
      },
      {
        type: "result",
        subtype: "partial",
        cost_usd: 0.1,
        tokens_used: 20000,
        duration_ms: 60000,
        timestamp: "2026-03-01T00:00:01Z",
      },
    ];

    const usage = getTokenUsage(events);
    expect(usage.cost_usd).toBeCloseTo(0.15, 10);
    expect(usage.tokens_used).toBe(30000);
    expect(usage.duration_ms).toBe(90000);
  });
});

describe("getAgentDiagnostics", () => {
  let tempDir: string;
  let logsDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `df-test-diag-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    logsDir = join(tempDir, "logs");
    mkdirSync(logsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns full diagnostics from a log file", () => {
    const writer = new AgentLogWriter(logsDir, "agt_diag");
    writer.write({
      type: "system",
      subtype: "init",
      message: "Starting agent",
      timestamp: "2026-03-01T00:00:00Z",
    });
    writer.write({
      type: "assistant",
      subtype: "tool_use",
      tool_name: "Bash",
      tool_input: { command: "bun test" },
      timestamp: "2026-03-01T00:00:01Z",
    });
    writer.write({
      type: "assistant",
      subtype: "text",
      message: "Tests passed",
      timestamp: "2026-03-01T00:00:02Z",
    });
    writer.write({
      type: "result",
      subtype: "success",
      cost_usd: 0.25,
      tokens_used: 75000,
      duration_ms: 180000,
      timestamp: "2026-03-01T00:00:03Z",
    });
    writer.close();

    const diag = getAgentDiagnostics(writer.logPath);

    expect(diag.eventCount).toBe(4);
    expect(diag.lastToolCall).toBeDefined();
    expect(diag.lastToolCall?.tool_name).toBe("Bash");
    expect(diag.tokenUsage.cost_usd).toBe(0.25);
    expect(diag.tokenUsage.tokens_used).toBe(75000);
    expect(diag.tokenUsage.duration_ms).toBe(180000);
    expect(diag.hasResult).toBe(true);
  });

  it("detects a crash (no result event)", () => {
    const writer = new AgentLogWriter(logsDir, "agt_crashed");
    writer.write({
      type: "system",
      subtype: "init",
      message: "Starting",
      timestamp: "2026-03-01T00:00:00Z",
    });
    writer.write({
      type: "assistant",
      subtype: "tool_use",
      tool_name: "Edit",
      tool_input: { file_path: "/foo.ts" },
      timestamp: "2026-03-01T00:00:01Z",
    });
    // No result event — process crashed
    writer.close();

    const diag = getAgentDiagnostics(writer.logPath);

    expect(diag.eventCount).toBe(2);
    expect(diag.hasResult).toBe(false);
    expect(diag.lastToolCall?.tool_name).toBe("Edit");
    expect(diag.tokenUsage.cost_usd).toBe(0);
  });

  it("returns empty diagnostics for non-existent log", () => {
    const diag = getAgentDiagnostics(join(logsDir, "agt_missing.jsonl"));

    expect(diag.eventCount).toBe(0);
    expect(diag.hasResult).toBe(false);
    expect(diag.lastToolCall).toBeUndefined();
    expect(diag.tokenUsage.cost_usd).toBe(0);
  });
});

describe("getLogsDir / getAgentLogPath", () => {
  it("getLogsDir returns correct path", () => {
    expect(getLogsDir("/project/.df")).toBe(join("/project/.df", "logs"));
  });

  it("getAgentLogPath returns correct path", () => {
    expect(getAgentLogPath("/project/.df", "agt_abc123")).toBe(
      join("/project/.df", "logs", "agt_abc123.jsonl"),
    );
  });
});
