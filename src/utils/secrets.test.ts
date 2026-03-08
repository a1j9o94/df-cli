import { test, expect, beforeEach, afterEach } from "bun:test";
import { encryptSecret, decryptSecret, listSecretNames } from "./secrets.js";
import { getDbForTest, type SqliteDb } from "../db/index.js";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Use a temp dir for the key file in tests
let tmpDir: string;
let originalCwd: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "secrets-test-"));
  originalCwd = process.cwd();
  // Create .df directory
  const dfDir = join(tmpDir, ".df");
  require("node:fs").mkdirSync(dfDir, { recursive: true });
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(tmpDir, { recursive: true, force: true });
});

test("encryptSecret returns a base64 string different from input", () => {
  const plaintext = "my-secret-api-key-12345";
  const encrypted = encryptSecret(plaintext);
  expect(typeof encrypted).toBe("string");
  expect(encrypted).not.toBe(plaintext);
  // Should be base64 encoded
  expect(encrypted.length).toBeGreaterThan(0);
});

test("decryptSecret recovers original plaintext", () => {
  const plaintext = "super-secret-value-!@#$%";
  const encrypted = encryptSecret(plaintext);
  const decrypted = decryptSecret(encrypted);
  expect(decrypted).toBe(plaintext);
});

test("encrypt/decrypt handles empty string", () => {
  const encrypted = encryptSecret("");
  const decrypted = decryptSecret(encrypted);
  expect(decrypted).toBe("");
});

test("encrypt/decrypt handles unicode", () => {
  const plaintext = "日本語テスト 🔑";
  const encrypted = encryptSecret(plaintext);
  const decrypted = decryptSecret(encrypted);
  expect(decrypted).toBe(plaintext);
});

test("same plaintext produces different ciphertext (random IV)", () => {
  const plaintext = "same-value";
  const e1 = encryptSecret(plaintext);
  const e2 = encryptSecret(plaintext);
  expect(e1).not.toBe(e2); // Different IVs should produce different output
  expect(decryptSecret(e1)).toBe(plaintext);
  expect(decryptSecret(e2)).toBe(plaintext);
});

test("key file is auto-created in .df/secrets.key", () => {
  const keyPath = join(tmpDir, ".df", "secrets.key");
  expect(existsSync(keyPath)).toBe(false);
  encryptSecret("trigger-key-creation");
  expect(existsSync(keyPath)).toBe(true);
});

test("listSecretNames returns secret names without values", () => {
  const db = getDbForTest();

  // Seed data
  db.prepare("INSERT INTO runs (id, spec_id, status) VALUES (?, ?, ?)").run("run_1", "spec_1", "running");
  db.prepare("INSERT INTO agents (id, run_id, role, name, status, system_prompt) VALUES (?, ?, ?, ?, ?, ?)").run("agt_1", "run_1", "builder", "b1", "running", "p");

  db.prepare(`INSERT INTO blocker_requests (id, run_id, agent_id, type, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run("blk_1", "run_1", "agt_1", "secret", "API key", "resolved", "2026-03-08T00:00:00Z", "2026-03-08T00:00:00Z");
  db.prepare(`INSERT INTO blocker_requests (id, run_id, agent_id, type, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run("blk_2", "run_1", "agt_1", "secret", "DB pass", "resolved", "2026-03-08T01:00:00Z", "2026-03-08T01:00:00Z");

  db.prepare(`INSERT INTO blocker_secrets (id, blocker_id, run_id, name, encrypted_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run("sec_1", "blk_1", "run_1", "API_KEY", "enc1", "2026-03-08T00:00:00Z");
  db.prepare(`INSERT INTO blocker_secrets (id, blocker_id, run_id, name, encrypted_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run("sec_2", "blk_2", "run_1", "DB_PASSWORD", "enc2", "2026-03-08T01:00:00Z");

  const secrets = listSecretNames(db);
  expect(secrets).toHaveLength(2);
  expect(secrets[0].name).toBe("API_KEY");
  expect(secrets[0].blocker_id).toBe("blk_1");
  expect(secrets[0]).not.toHaveProperty("encrypted_value");

  db.close();
});

test("listSecretNames filters by run_id", () => {
  const db = getDbForTest();

  db.prepare("INSERT INTO runs (id, spec_id, status) VALUES (?, ?, ?)").run("run_1", "spec_1", "running");
  db.prepare("INSERT INTO runs (id, spec_id, status) VALUES (?, ?, ?)").run("run_2", "spec_2", "running");
  db.prepare("INSERT INTO agents (id, run_id, role, name, status, system_prompt) VALUES (?, ?, ?, ?, ?, ?)").run("agt_1", "run_1", "builder", "b1", "running", "p");
  db.prepare("INSERT INTO agents (id, run_id, role, name, status, system_prompt) VALUES (?, ?, ?, ?, ?, ?)").run("agt_2", "run_2", "builder", "b2", "running", "p");

  db.prepare(`INSERT INTO blocker_requests (id, run_id, agent_id, type, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run("blk_1", "run_1", "agt_1", "secret", "key1", "resolved", "2026-03-08T00:00:00Z", "2026-03-08T00:00:00Z");
  db.prepare(`INSERT INTO blocker_requests (id, run_id, agent_id, type, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run("blk_2", "run_2", "agt_2", "secret", "key2", "resolved", "2026-03-08T00:00:00Z", "2026-03-08T00:00:00Z");

  db.prepare(`INSERT INTO blocker_secrets (id, blocker_id, run_id, name, encrypted_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run("sec_1", "blk_1", "run_1", "KEY1", "enc1", "2026-03-08T00:00:00Z");
  db.prepare(`INSERT INTO blocker_secrets (id, blocker_id, run_id, name, encrypted_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run("sec_2", "blk_2", "run_2", "KEY2", "enc2", "2026-03-08T00:00:00Z");

  const run1Secrets = listSecretNames(db, "run_1");
  expect(run1Secrets).toHaveLength(1);
  expect(run1Secrets[0].name).toBe("KEY1");

  const allSecrets = listSecretNames(db);
  expect(allSecrets).toHaveLength(2);

  db.close();
});
