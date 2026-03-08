import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "enc:";

/**
 * Encrypt a secret value using AES-256-GCM.
 * Returns a prefixed base64 string containing IV + authTag + ciphertext.
 */
export function encryptSecret(plaintext: string, key: string): string {
  const keyBuffer = Buffer.from(key, "utf-8").subarray(0, 32);
  if (keyBuffer.length < 32) {
    throw new Error("Encryption key must be at least 32 bytes");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Format: PREFIX + base64(iv + authTag + ciphertext)
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return PREFIX + combined.toString("base64");
}

/**
 * Decrypt a secret value encrypted with encryptSecret.
 */
export function decryptSecret(encryptedValue: string, key: string): string {
  if (!encryptedValue.startsWith(PREFIX)) {
    throw new Error("Value is not encrypted (missing prefix)");
  }

  const keyBuffer = Buffer.from(key, "utf-8").subarray(0, 32);
  if (keyBuffer.length < 32) {
    throw new Error("Encryption key must be at least 32 bytes");
  }

  const combined = Buffer.from(encryptedValue.slice(PREFIX.length), "base64");

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}

/**
 * Check if a value looks like it was encrypted by encryptSecret.
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

/**
 * Mask a secret for display — shows only last 4 characters.
 */
export function maskSecret(value: string): string {
  if (value.length === 0) return "";
  if (value.length <= 4) return "*".repeat(value.length);
  return "*".repeat(value.length - 4) + value.slice(-4);
}

/**
 * Get or generate the project encryption key.
 * Stored in .df/secret.key (should be gitignored).
 */
export function getEncryptionKey(dfDir: string): string {
  const keyPath = join(dfDir, "secret.key");
  if (existsSync(keyPath)) {
    return readFileSync(keyPath, "utf-8").trim();
  }
  // Generate a new key
  const key = randomBytes(32).toString("hex");
  writeFileSync(keyPath, key, { mode: 0o600 });
  return key;
}
