// E8-S1-T2: Credential encryption service using AES-256-GCM.
// SECURITY CRITICAL: Payment credentials are encrypted at rest.
// The encryption key is derived from the PAYMENT_ENCRYPTION_KEY env var.
// This module provides encrypt/decrypt for provider credentials JSON.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit IV for GCM
const KEY_LENGTH = 32; // 256-bit key

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class CredentialEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialEncryptionError";
  }
}

// ---------------------------------------------------------------------------
// Key management
// ---------------------------------------------------------------------------

/**
 * Resolves the encryption key from environment or provided override.
 * Returns a 32-byte buffer from a hex-encoded key string.
 */
export function resolveEncryptionKey(keyOverride?: string): Buffer {
  const keyHex = keyOverride ?? process.env.PAYMENT_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length === 0) {
    throw new CredentialEncryptionError(
      "PAYMENT_ENCRYPTION_KEY is not configured. Cannot encrypt credentials.",
    );
  }
  const keyBuffer = Buffer.from(keyHex, "hex");
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new CredentialEncryptionError(
      `Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters). Got ${keyBuffer.length} bytes.`,
    );
  }
  return keyBuffer;
}

// ---------------------------------------------------------------------------
// Encrypt / Decrypt
// ---------------------------------------------------------------------------

export type EncryptedPayload = {
  ciphertext: string; // hex-encoded ciphertext
  iv: string; // hex-encoded IV
  tag: string; // hex-encoded auth tag
};

/**
 * Encrypts a JSON-serializable credentials object using AES-256-GCM.
 * Returns the ciphertext, IV, and authentication tag as hex strings.
 */
export function encryptCredentials(
  credentials: Record<string, unknown>,
  encryptionKey?: string,
): EncryptedPayload {
  const key = resolveEncryptionKey(encryptionKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(credentials);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

/**
 * Decrypts an encrypted credentials payload back to the original object.
 * Requires the same encryption key that was used to encrypt.
 */
export function decryptCredentials(
  payload: EncryptedPayload,
  encryptionKey?: string,
): Record<string, unknown> {
  const key = resolveEncryptionKey(encryptionKey);
  const iv = Buffer.from(payload.iv, "hex");
  const tag = Buffer.from(payload.tag, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(payload.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted) as Record<string, unknown>;
}
