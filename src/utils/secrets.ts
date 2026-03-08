import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { SqliteDb } from "../db/index.js";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;

function getKeyPath(): string {
  return join(process.cwd(), ".df", "secrets.key");
}

function getOrCreateKey(): Buffer {
  const keyPath = getKeyPath();

  if (existsSync(keyPath)) {
    return readFileSync(keyPath);
  }

  // Ensure .df directory exists
  const dfDir = join(process.cwd(), ".df");
  if (!existsSync(dfDir)) {
    mkdirSync(dfDir, { recursive: true });
  }

  const key = randomBytes(KEY_LENGTH);
  writeFileSync(keyPath, key, { mode: 0o600 });
  return key;
}

/**
 * Encrypts a secret value using AES-256-GCM.
 * Returns a base64 string containing IV + auth tag + ciphertext.
 */
export function encryptSecret(value: string): string {
  const key = getOrCreateKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Pack: IV (12) + authTag (16) + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString("base64");
}

/**
 * Decrypts a base64 encrypted string back to plaintext.
 */
export function decryptSecret(encrypted: string): string {
  const key = getOrCreateKey();
  const packed = Buffer.from(encrypted, "base64");

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Lists secret names (without values) from the blocker_secrets table.
 */
export function listSecretNames(
  db: SqliteDb,
  runId?: string
): Array<{ name: string; blocker_id: string; created_at: string }> {
  if (runId) {
    return db
      .prepare(
        "SELECT name, blocker_id, created_at FROM blocker_secrets WHERE run_id = ? ORDER BY created_at"
      )
      .all(runId) as Array<{ name: string; blocker_id: string; created_at: string }>;
  }
  return db
    .prepare(
      "SELECT name, blocker_id, created_at FROM blocker_secrets ORDER BY created_at"
    )
    .all() as Array<{ name: string; blocker_id: string; created_at: string }>;
}
