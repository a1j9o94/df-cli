import { test, expect, describe } from "bun:test";
import {
  encryptSecret,
  decryptSecret,
  isEncrypted,
  maskSecret,
} from "../../../src/utils/secrets.js";

describe("secret encryption utilities", () => {
  const testKey = "test-encryption-key-32-chars-ok!"; // 32 bytes for AES-256

  test("encryptSecret returns a non-plaintext string", () => {
    const plaintext = "sk_test_abc123";
    const encrypted = encryptSecret(plaintext, testKey);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.length).toBeGreaterThan(0);
  });

  test("decryptSecret returns the original plaintext", () => {
    const plaintext = "sk_test_abc123";
    const encrypted = encryptSecret(plaintext, testKey);
    const decrypted = decryptSecret(encrypted, testKey);
    expect(decrypted).toBe(plaintext);
  });

  test("encrypting the same value twice produces different ciphertexts (random IV)", () => {
    const plaintext = "my-secret-value";
    const enc1 = encryptSecret(plaintext, testKey);
    const enc2 = encryptSecret(plaintext, testKey);
    expect(enc1).not.toBe(enc2);
  });

  test("decryption with wrong key fails", () => {
    const plaintext = "sensitive-data";
    const encrypted = encryptSecret(plaintext, testKey);
    const wrongKey = "wrong-key-32-characters-padding!";
    expect(() => decryptSecret(encrypted, wrongKey)).toThrow();
  });

  test("isEncrypted detects encrypted values", () => {
    const plaintext = "sk_test_abc123";
    const encrypted = encryptSecret(plaintext, testKey);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(isEncrypted(plaintext)).toBe(false);
  });

  test("maskSecret masks all but last 4 chars", () => {
    expect(maskSecret("sk_test_abc123")).toBe("**********c123");
    expect(maskSecret("ab")).toBe("**");
    expect(maskSecret("")).toBe("");
  });
});
