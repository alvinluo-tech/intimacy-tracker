import { createHmac, timingSafeEqual, randomBytes, scryptSync } from "node:crypto";

const PIN_REGEX = /^\d{4,6}$/;
const LEGACY_HASH_PREFIX = "v1:";
const SCRYPT_HASH_PREFIX = "v2:";

export type HashPrefix = "v1:" | "v2:";

export function getHashPrefix(pinHash: string): HashPrefix | null {
  if (pinHash.startsWith(SCRYPT_HASH_PREFIX)) return "v2:";
  if (pinHash.startsWith(LEGACY_HASH_PREFIX)) return "v1:";
  return null;
}
const SCRYPT_KEYLEN = 32;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

function getSecret() {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET is not configured");
  return secret;
}

export function isValidPin(pin: string) {
  return PIN_REGEX.test(pin);
}

function legacyDigest(pin: string) {
  return createHmac("sha256", getSecret()).update(pin).digest("hex");
}

function deriveScrypt(pin: string, salt: Buffer): Buffer {
  return scryptSync(pin, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });
}

export function hashPin(pin: string): string {
  if (!isValidPin(pin)) {
    throw new Error("Invalid PIN format");
  }
  const salt = randomBytes(16);
  const hash = deriveScrypt(pin, salt);
  return `${SCRYPT_HASH_PREFIX}${pin.length}:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function getPinLengthFromHash(pinHash: string | null | undefined): number | null {
  if (!pinHash) return null;

  if (pinHash.startsWith(SCRYPT_HASH_PREFIX)) {
    const payload = pinHash.slice(SCRYPT_HASH_PREFIX.length);
    const segs = payload.split(":");
    if (segs.length !== 3) return null;
    const len = Number(segs[0]);
    if (!Number.isInteger(len) || len < 4 || len > 6) return null;
    return len;
  }

  if (pinHash.startsWith(LEGACY_HASH_PREFIX)) {
    const payload = pinHash.slice(LEGACY_HASH_PREFIX.length);
    const segs = payload.split(":");
    if (segs.length !== 2) return null;
    const len = Number(segs[0]);
    if (!Number.isInteger(len) || len < 4 || len > 6) return null;
    return len;
  }

  return null;
}

export function verifyPin(pin: string, pinHash: string | null | undefined): boolean {
  if (!pinHash || !isValidPin(pin)) return false;

  // v2: scrypt with per-user salt
  if (pinHash.startsWith(SCRYPT_HASH_PREFIX)) {
    const payload = pinHash.slice(SCRYPT_HASH_PREFIX.length);
    const segs = payload.split(":");
    if (segs.length !== 3) return false;
    const expectedLen = Number(segs[0]);
    const salt = Buffer.from(segs[1], "hex");
    const expected = Buffer.from(segs[2], "hex");
    if (expectedLen && pin.length !== expectedLen) return false;
    const current = deriveScrypt(pin, salt);
    if (expected.length !== current.length) return false;
    return timingSafeEqual(expected, current);
  }

  // v1: legacy HMAC (backward compatible)
  if (pinHash.startsWith(LEGACY_HASH_PREFIX)) {
    const payload = pinHash.slice(LEGACY_HASH_PREFIX.length);
    const segs = payload.split(":");
    const expected = segs.length === 2 ? segs[1] : payload;
    const expectedLen = segs.length === 2 ? Number(segs[0]) : null;
    if (expectedLen && pin.length !== expectedLen) return false;
    const current = legacyDigest(pin);
    const a = Buffer.from(expected);
    const b = Buffer.from(current);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  return false;
}
