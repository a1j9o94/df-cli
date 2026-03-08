import { test, expect, beforeEach, afterEach } from "bun:test";
import { encryptSecret, decryptSecret, isEncrypted, maskSecret, getEncryptionKey } from "./secrets.js";
import { mkdtempSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir: string;
let dfDir: string;
let encKey: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "secrets-test-"));
  dfDir = join(tmpDir, ".df");
  mkdirSync(dfDir, { recursive: true });
  encKey = getEncryptionKey(dfDir);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

test("encryptSecret returns a prefixed string different from input", () => {
  const plaintext = "my-secret-api-key-12345";
  const encrypted = encryptSecret(plaintext, encKey);
  expect(typeof encrypted).toBe("string");
  expect(encrypted).not.toBe(plaintext);
  expect(encrypted.startsWith("enc:")).toBe(true);
});

test("decryptSecret recovers original plaintext", () => {
  const plaintext = "super-secret-value-!@#$%";
  const encrypted = encryptSecret(plaintext, encKey);
  const decrypted = decryptSecret(encrypted, encKey);
  expect(decrypted).toBe(plaintext);
});

test("encrypt/decrypt handles empty string", () => {
  const encrypted = encryptSecret("", encKey);
  const decrypted = decryptSecret(encrypted, encKey);
  expect(decrypted).toBe("");
});

test("encrypt/decrypt handles unicode", () => {
  const plaintext = "日本語テスト 🔑";
  const encrypted = encryptSecret(plaintext, encKey);
  const decrypted = decryptSecret(encrypted, encKey);
  expect(decrypted).toBe(plaintext);
});

test("same plaintext produces different ciphertext (random IV)", () => {
  const plaintext = "same-value";
  const e1 = encryptSecret(plaintext, encKey);
  const e2 = encryptSecret(plaintext, encKey);
  expect(e1).not.toBe(e2);
  expect(decryptSecret(e1, encKey)).toBe(plaintext);
  expect(decryptSecret(e2, encKey)).toBe(plaintext);
});

test("isEncrypted detects encrypted values", () => {
  const encrypted = encryptSecret("test", encKey);
  expect(isEncrypted(encrypted)).toBe(true);
  expect(isEncrypted("plain-text")).toBe(false);
});

test("maskSecret masks all but last 4 characters", () => {
  expect(maskSecret("my-secret-key")).toBe("*********-key");
  expect(maskSecret("abc")).toBe("***");
  expect(maskSecret("")).toBe("");
});

test("getEncryptionKey creates key file on first call", () => {
  const newTmpDir = mkdtempSync(join(tmpdir(), "secrets-key-test-"));
  const newDfDir = join(newTmpDir, ".df");
  mkdirSync(newDfDir, { recursive: true });
  const keyPath = join(newDfDir, "secret.key");
  expect(existsSync(keyPath)).toBe(false);
  getEncryptionKey(newDfDir);
  expect(existsSync(keyPath)).toBe(true);
  rmSync(newTmpDir, { recursive: true, force: true });
});

test("getEncryptionKey returns same key on subsequent calls", () => {
  const key1 = getEncryptionKey(dfDir);
  const key2 = getEncryptionKey(dfDir);
  expect(key1).toBe(key2);
});
