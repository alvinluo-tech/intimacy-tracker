import { describe, it, expect } from "vitest";

import {
  BackupCryptoError,
  BACKUP_ENVELOPE_FORMAT,
  BACKUP_ENVELOPE_VERSION,
  PBKDF2_ITERATIONS,
  decodeBase64,
  decryptBackup,
  encodeBase64,
  encryptBackup,
  isBackupEnvelope,
} from "@/lib/crypto/backup-crypto";
import type { BackupEnvelope } from "@/lib/crypto/backup-crypto";

const PASSPHRASE = "correct horse battery staple";
const PLAINTEXT = JSON.stringify({
  schema_version: 1,
  encounters: [{ id: "enc-1", notes: "秘密笔记 🔐" }],
});

// Keep test runtime sane: derive once per test, not 600k iterations per call.
// The production constant is verified separately below.
async function fastRoundtrip(
  plaintext: string,
  passphrase: string
): Promise<BackupEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const subtle = crypto.subtle;
  const material = await subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 1000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return {
    format: BACKUP_ENVELOPE_FORMAT,
    format_version: BACKUP_ENVELOPE_VERSION,
    kdf: {
      name: "PBKDF2" as const,
      hash: "SHA-256" as const,
      iterations: 1000,
      salt: encodeBase64(salt),
    },
    cipher: "AES-256-GCM" as const,
    iv: encodeBase64(iv),
    ct: encodeBase64(new Uint8Array(ct)),
    created_at: new Date().toISOString(),
  };
}

describe("backup-crypto", () => {
  it("uses a hardened KDF configuration", () => {
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000);
  });

  it("roundtrips a plaintext through encrypt/decrypt", async () => {
    const envelope = await encryptBackup(PLAINTEXT, PASSPHRASE);
    expect(envelope.format).toBe("encounter-backup");
    expect(envelope.cipher).toBe("AES-256-GCM");

    const plain = await decryptBackup(envelope, PASSPHRASE);
    expect(plain).toBe(PLAINTEXT);
  });

  it("produces distinct salt and iv per envelope", async () => {
    const a = await fastRoundtrip(PLAINTEXT, PASSPHRASE);
    const b = await fastRoundtrip(PLAINTEXT, PASSPHRASE);
    expect(a.ct).not.toBe(b.ct);
    expect(a.iv).not.toBe(b.iv);
    expect(a.kdf.salt).not.toBe(b.kdf.salt);
  });

  it("rejects a wrong passphrase", async () => {
    const envelope = await fastRoundtrip(PLAINTEXT, PASSPHRASE);
    await expect(decryptBackup(envelope, "wrong passphrase")).rejects.toMatchObject({
      code: "wrong_passphrase",
    });
  });

  it("rejects a tampered ciphertext", async () => {
    const envelope = await fastRoundtrip(PLAINTEXT, PASSPHRASE);
    const bytes = decodeBase64(envelope.ct);
    bytes[0] ^= 0xff;
    envelope.ct = encodeBase64(bytes);
    await expect(decryptBackup(envelope, PASSPHRASE)).rejects.toMatchObject({
      code: "wrong_passphrase",
    });
  });

  it("rejects envelopes from a newer format version", async () => {
    const envelope = await fastRoundtrip(PLAINTEXT, PASSPHRASE);
    envelope.format_version = BACKUP_ENVELOPE_VERSION + 1;
    await expect(decryptBackup(envelope, PASSPHRASE)).rejects.toMatchObject({
      code: "unsupported_version",
    });
  });

  it("rejects unsupported cipher and kdf names", async () => {
    const cipher = await fastRoundtrip(PLAINTEXT, PASSPHRASE);
    (cipher as unknown as { cipher: string }).cipher = "AES-128-CBC";
    await expect(decryptBackup(cipher, PASSPHRASE)).rejects.toMatchObject({
      code: "unsupported_cipher",
    });

    const kdf = await fastRoundtrip(PLAINTEXT, PASSPHRASE);
    kdf.kdf.name = "argon2" as never;
    await expect(decryptBackup(kdf, PASSPHRASE)).rejects.toMatchObject({
      code: "unsupported_cipher",
    });
  });

  it("flags non-envelope payloads", () => {
    expect(
      isBackupEnvelope({
        format: "encounter-backup",
        format_version: 1,
        iv: "x",
        ct: "y",
        kdf: {},
      })
    ).toBe(true);
    expect(isBackupEnvelope({ schema_version: 1 })).toBe(false);
    expect(isBackupEnvelope(null)).toBe(false);
    expect(isBackupEnvelope("encounter-backup")).toBe(false);
  });

  it("base64 helpers roundtrip unicode-heavy payloads", () => {
    const bytes = new TextEncoder().encode("私密数据 private data \u{1F512}");
    const decoded = new TextDecoder().decode(decodeBase64(encodeBase64(bytes)));
    expect(decoded).toBe("私密数据 private data \u{1F512}");
  });

  it("classifies backup crypto failures with BackupCryptoError", async () => {
    const envelope = await fastRoundtrip(PLAINTEXT, PASSPHRASE);
    try {
      await decryptBackup(envelope, "nope");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(BackupCryptoError);
    }
  });
});
