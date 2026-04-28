import { createHmac, timingSafeEqual } from "node:crypto";

const PIN_REGEX = /^\d{4,6}$/;
const HASH_PREFIX = "v1:";

function getSecret() {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET is not configured");
  return secret;
}

export function isValidPin(pin: string) {
  return PIN_REGEX.test(pin);
}

function digest(pin: string) {
  return createHmac("sha256", getSecret()).update(pin).digest("hex");
}

export function hashPin(pin: string) {
  if (!isValidPin(pin)) {
    throw new Error("PIN 必须是 4 到 6 位数字");
  }
  return `${HASH_PREFIX}${pin.length}:${digest(pin)}`;
}

export function getPinLengthFromHash(pinHash: string | null | undefined) {
  if (!pinHash?.startsWith(HASH_PREFIX)) return null;
  const payload = pinHash.slice(HASH_PREFIX.length);
  const segs = payload.split(":");
  if (segs.length !== 2) return null;
  const len = Number(segs[0]);
  if (!Number.isInteger(len) || len < 4 || len > 6) return null;
  return len;
}

export function verifyPin(pin: string, pinHash: string | null | undefined) {
  if (!pinHash?.startsWith(HASH_PREFIX)) return false;
  if (!isValidPin(pin)) return false;
  const payload = pinHash.slice(HASH_PREFIX.length);
  const segs = payload.split(":");
  const expected = segs.length === 2 ? segs[1] : payload;
  const expectedLen = segs.length === 2 ? Number(segs[0]) : null;
  if (expectedLen && pin.length !== expectedLen) return false;
  const current = digest(pin);
  const a = Buffer.from(expected);
  const b = Buffer.from(current);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
