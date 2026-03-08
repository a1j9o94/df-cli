import { test, expect } from "bun:test";
import { getDbForTest } from "./index.js";

test("blocker_requests table exists and accepts inserts", () => {
  const db = getDbForTest();

  // First create a run (foreign key)
  db.prepare("INSERT INTO runs (id, spec_id, status) VALUES (?, ?, ?)").run("run_test", "spec_test", "running");
  db.prepare("INSERT INTO agents (id, run_id, role, name, status, system_prompt) VALUES (?, ?, ?, ?, ?, ?)").run("agt_test", "run_test", "builder", "test", "running", "prompt");

  db.prepare(`INSERT INTO blocker_requests (id, run_id, agent_id, module_id, type, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    "blk_test", "run_test", "agt_test", "mod_test", "secret", "Need API key", "pending",
    "2026-03-08T00:00:00Z", "2026-03-08T00:00:00Z"
  );

  const row = db.prepare("SELECT * FROM blocker_requests WHERE id = ?").get("blk_test") as any;
  expect(row).toBeDefined();
  expect(row.type).toBe("secret");
  expect(row.status).toBe("pending");
  expect(row.resolved_value).toBeNull();
  expect(row.resolved_by).toBeNull();
  db.close();
});

test("blocker_requests has proper indexes", () => {
  const db = getDbForTest();
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='blocker_requests'").all() as any[];
  const indexNames = indexes.map((i: any) => i.name);
  expect(indexNames).toContain("idx_blocker_requests_run");
  expect(indexNames).toContain("idx_blocker_requests_agent");
  expect(indexNames).toContain("idx_blocker_requests_status");
  db.close();
});

test("blocker_secrets table exists and accepts inserts", () => {
  const db = getDbForTest();

  db.prepare("INSERT INTO runs (id, spec_id, status) VALUES (?, ?, ?)").run("run_test", "spec_test", "running");
  db.prepare("INSERT INTO agents (id, run_id, role, name, status, system_prompt) VALUES (?, ?, ?, ?, ?, ?)").run("agt_test", "run_test", "builder", "test", "running", "prompt");
  db.prepare(`INSERT INTO blocker_requests (id, run_id, agent_id, type, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    "blk_test", "run_test", "agt_test", "secret", "Need API key", "resolved",
    "2026-03-08T00:00:00Z", "2026-03-08T00:00:00Z"
  );

  db.prepare(`INSERT INTO blocker_secrets (id, blocker_id, run_id, name, encrypted_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run(
    "sec_test", "blk_test", "run_test", "API_KEY", "encrypted_base64_data", "2026-03-08T00:00:00Z"
  );

  const row = db.prepare("SELECT * FROM blocker_secrets WHERE id = ?").get("sec_test") as any;
  expect(row).toBeDefined();
  expect(row.name).toBe("API_KEY");
  expect(row.encrypted_value).toBe("encrypted_base64_data");
  db.close();
});

test("blocker_requests resolved fields update correctly", () => {
  const db = getDbForTest();

  db.prepare("INSERT INTO runs (id, spec_id, status) VALUES (?, ?, ?)").run("run_test", "spec_test", "running");
  db.prepare("INSERT INTO agents (id, run_id, role, name, status, system_prompt) VALUES (?, ?, ?, ?, ?, ?)").run("agt_test", "run_test", "builder", "test", "running", "prompt");
  db.prepare(`INSERT INTO blocker_requests (id, run_id, agent_id, type, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    "blk_test", "run_test", "agt_test", "decision", "Need approval", "pending",
    "2026-03-08T00:00:00Z", "2026-03-08T00:00:00Z"
  );

  db.prepare(`UPDATE blocker_requests SET status = 'resolved', resolved_value = ?, resolved_by = 'cli', resolved_at = ?, updated_at = ? WHERE id = ?`).run(
    "approved", "2026-03-08T01:00:00Z", "2026-03-08T01:00:00Z", "blk_test"
  );

  const row = db.prepare("SELECT * FROM blocker_requests WHERE id = ?").get("blk_test") as any;
  expect(row.status).toBe("resolved");
  expect(row.resolved_value).toBe("approved");
  expect(row.resolved_by).toBe("cli");
  db.close();
});
