import { test, expect } from "bun:test";
import type { BlockerType, BlockerStatus, BlockerRecord, BlockerResolution } from "./blocker.js";

test("BlockerType accepts valid types", () => {
  const types: BlockerType[] = ["secret", "access", "decision", "resource"];
  expect(types).toHaveLength(4);
});

test("BlockerStatus accepts valid statuses", () => {
  const statuses: BlockerStatus[] = ["pending", "resolved"];
  expect(statuses).toHaveLength(2);
});

test("BlockerRecord has all required fields", () => {
  const record: BlockerRecord = {
    id: "blk_test",
    run_id: "run_test",
    agent_id: "agt_test",
    module_id: null,
    type: "secret",
    description: "Need API key",
    status: "pending",
    resolved_value: null,
    resolved_by: null,
    resolved_at: null,
    created_at: "2026-03-08T00:00:00Z",
    updated_at: "2026-03-08T00:00:00Z",
  };
  expect(record.id).toBe("blk_test");
  expect(record.status).toBe("pending");
  expect(record.resolved_value).toBeNull();
});

test("BlockerRecord with resolved state", () => {
  const record: BlockerRecord = {
    id: "blk_test",
    run_id: "run_test",
    agent_id: "agt_test",
    module_id: "mod_test",
    type: "decision",
    description: "Need approval",
    status: "resolved",
    resolved_value: "approved",
    resolved_by: "cli",
    resolved_at: "2026-03-08T01:00:00Z",
    created_at: "2026-03-08T00:00:00Z",
    updated_at: "2026-03-08T01:00:00Z",
  };
  expect(record.status).toBe("resolved");
  expect(record.resolved_by).toBe("cli");
  expect(record.resolved_value).toBe("approved");
});

test("BlockerResolution supports all resolution methods", () => {
  const byValue: BlockerResolution = { value: "some-key" };
  expect(byValue.value).toBe("some-key");

  const byFile: BlockerResolution = { file_path: "/path/to/key" };
  expect(byFile.file_path).toBe("/path/to/key");

  const byEnv: BlockerResolution = { env_key: "API_KEY", env_value: "secret123" };
  expect(byEnv.env_key).toBe("API_KEY");
  expect(byEnv.env_value).toBe("secret123");
});
