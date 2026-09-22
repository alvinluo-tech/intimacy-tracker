// Client-side encryption for data backups. The passphrase never leaves the
// browser: the server ships the plaintext export over TLS, and this module
// seals it into an encrypted envelope before it touches the disk. That is what
// the settings copy promises ("encrypted backup") — the file at rest in the
// Downloads folder (and wherever it syncs afterwards) is ciphertext.

export const BACKUP_ENVELOPE_FORMAT = "encounter-backup";
export const BACKUP_ENVELOPE_VERSION = 1;
export const PBKDF2_ITERATIONS = 600_000;

const KDF_SALT_BYTES = 16;
const IV_BYTES = 12;
// btoa/String.fromCharCode blow the stack on multi-MB payloads without chunking.
const BASE64_CHUNK = 0x8000;

export type BackupEnvelope = {
  format: typeof BACKUP_ENVELOPE_FORMAT;
  format_version: number;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number; salt: string };
  cipher: "AES-256-GCM";
  iv: string;
  /** base64 ciphertext; the plaintext is the JSON full export. */
  ct: string;
  created_at: string;
};

export type BackupCryptoErrorCode =
  | "malformed"
  | "unsupported_version"
  | "unsupported_cipher"
  | "wrong_passphrase";

export class BackupCryptoError extends Error {
  code: BackupCryptoErrorCode;

  constructor(code: BackupCryptoErrorCode, detail?: string) {
    super(detail ?? code);
    this.name = "BackupCryptoError";
    this.code = code;
  }
}

export function isBackupEnvelope(value: unknown): value is BackupEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.format === BACKUP_ENVELOPE_FORMAT &&
    typeof v.format_version === "number" &&
    typeof v.iv === "string" &&
    typeof v.ct === "string" &&
    typeof v.kdf === "object" &&
    v.kdf !== null
  );
}

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new BackupCryptoError("malformed", "WebCrypto is unavailable in this context");
  }
  return subtle;
}

export function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
}

export function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const keyMaterial = await subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Seals a plaintext string (the JSON full export) into a backup envelope. */
export async function encryptBackup(
  plaintext: string,
  passphrase: string
): Promise<BackupEnvelope> {
  const subtle = getSubtle();
  const salt = crypto.getRandomValues(new Uint8Array(KDF_SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);

  const ct = await subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext)
  );

  return {
    format: BACKUP_ENVELOPE_FORMAT,
    format_version: BACKUP_ENVELOPE_VERSION,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: PBKDF2_ITERATIONS,
      salt: encodeBase64(salt),
    },
    cipher: "AES-256-GCM",
    iv: encodeBase64(iv),
    ct: encodeBase64(new Uint8Array(ct)),
    created_at: new Date().toISOString(),
  };
}

/**
 * Opens a backup envelope. GCM authentication makes a wrong passphrase and a
 * tampered ciphertext indistinguishable — both surface as wrong_passphrase.
 */
export async function decryptBackup(
  envelope: BackupEnvelope,
  passphrase: string
): Promise<string> {
  if (!isBackupEnvelope(envelope)) {
    throw new BackupCryptoError("malformed");
  }
  if (envelope.format_version > BACKUP_ENVELOPE_VERSION) {
    throw new BackupCryptoError("unsupported_version", `v${envelope.format_version}`);
  }
  if (envelope.cipher !== "AES-256-GCM") {
    throw new BackupCryptoError("unsupported_cipher", envelope.cipher);
  }
  if (
    envelope.kdf.name !== "PBKDF2" ||
    envelope.kdf.hash !== "SHA-256" ||
    typeof envelope.kdf.iterations !== "number" ||
    envelope.kdf.iterations < 1
  ) {
    throw new BackupCryptoError("unsupported_cipher", String(envelope.kdf.name));
  }

  let salt: Uint8Array;
  let iv: Uint8Array;
  let ct: Uint8Array;
  try {
    salt = decodeBase64(envelope.kdf.salt);
    iv = decodeBase64(envelope.iv);
    ct = decodeBase64(envelope.ct);
  } catch {
    throw new BackupCryptoError("malformed", "base64 fields");
  }

  const key = await deriveKey(passphrase, salt, envelope.kdf.iterations);
  try {
    const plain = await getSubtle().decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      ct as BufferSource
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new BackupCryptoError("wrong_passphrase");
  }
}
