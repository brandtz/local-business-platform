import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import {
  encryptCredentials,
  decryptCredentials,
  resolveEncryptionKey,
  CredentialEncryptionError,
} from "./credential-encryption.service";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const VALID_KEY = randomBytes(32).toString("hex");

const sampleCredentials = {
  provider: "stripe",
  publishableKey: "pk_test_123456",
  secretKey: "sk_test_789012",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CredentialEncryptionService", () => {
  const originalEnv = process.env.PAYMENT_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.PAYMENT_ENCRYPTION_KEY = VALID_KEY;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PAYMENT_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.PAYMENT_ENCRYPTION_KEY;
    }
  });

  // -----------------------------------------------------------------------
  // Key management
  // -----------------------------------------------------------------------

  describe("resolveEncryptionKey", () => {
    it("resolves key from environment variable", () => {
      const key = resolveEncryptionKey();
      expect(key.length).toBe(32);
    });

    it("resolves key from override", () => {
      const key = resolveEncryptionKey(VALID_KEY);
      expect(key.length).toBe(32);
    });

    it("throws if key is not configured", () => {
      delete process.env.PAYMENT_ENCRYPTION_KEY;
      expect(() => resolveEncryptionKey()).toThrow(CredentialEncryptionError);
    });

    it("throws if key is wrong length", () => {
      expect(() => resolveEncryptionKey("abcd")).toThrow(
        CredentialEncryptionError,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Encrypt / Decrypt roundtrip
  // -----------------------------------------------------------------------

  describe("encryptCredentials + decryptCredentials", () => {
    it("roundtrips credentials correctly", () => {
      const encrypted = encryptCredentials(sampleCredentials);
      const decrypted = decryptCredentials(encrypted);
      expect(decrypted).toEqual(sampleCredentials);
    });

    it("produces different ciphertexts for same input (random IV)", () => {
      const encrypted1 = encryptCredentials(sampleCredentials);
      const encrypted2 = encryptCredentials(sampleCredentials);
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it("ciphertext does not contain plaintext secrets", () => {
      const encrypted = encryptCredentials(sampleCredentials);
      expect(encrypted.ciphertext).not.toContain("pk_test_123456");
      expect(encrypted.ciphertext).not.toContain("sk_test_789012");
    });

    it("fails to decrypt with wrong key", () => {
      const encrypted = encryptCredentials(sampleCredentials, VALID_KEY);
      const wrongKey = randomBytes(32).toString("hex");
      expect(() =>
        decryptCredentials(encrypted, wrongKey),
      ).toThrow();
    });

    it("fails to decrypt with tampered ciphertext", () => {
      const encrypted = encryptCredentials(sampleCredentials);
      encrypted.ciphertext = "0000" + encrypted.ciphertext.slice(4);
      expect(() => decryptCredentials(encrypted)).toThrow();
    });

    it("handles complex nested credentials", () => {
      const complex = {
        provider: "square",
        applicationId: "sq-app-123",
        accessToken: "sq-token-456",
        locationId: "sq-loc-789",
        metadata: { version: 2, features: ["payments", "refunds"] },
      };
      const encrypted = encryptCredentials(complex);
      const decrypted = decryptCredentials(encrypted);
      expect(decrypted).toEqual(complex);
    });
  });

  // -----------------------------------------------------------------------
  // SECURITY: Encrypted output format
  // -----------------------------------------------------------------------

  describe("encrypted payload format", () => {
    it("returns hex-encoded ciphertext", () => {
      const encrypted = encryptCredentials(sampleCredentials);
      expect(typeof encrypted.ciphertext).toBe("string");
      expect(encrypted.ciphertext).toMatch(/^[0-9a-f]+$/);
    });

    it("returns hex-encoded IV", () => {
      const encrypted = encryptCredentials(sampleCredentials);
      expect(typeof encrypted.iv).toBe("string");
      expect(encrypted.iv).toMatch(/^[0-9a-f]+$/);
      expect(encrypted.iv.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it("returns hex-encoded auth tag", () => {
      const encrypted = encryptCredentials(sampleCredentials);
      expect(typeof encrypted.tag).toBe("string");
      expect(encrypted.tag).toMatch(/^[0-9a-f]+$/);
      expect(encrypted.tag.length).toBe(32); // 16 bytes = 32 hex chars
    });
  });
});
