import { createHmac, timingSafeEqual } from "node:crypto";

const PIN_REGEX = /^\d{4,6}$/;
const HASH_PREFIX = "v1:";

function getSecret() {
  return process.env.ENCRYPTION_SECRET ?? "dev-insecure-secret";
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
  return `${HASH_PREFIX}${digest(pin)}`;
}

export function verifyPin(pin: string, pinHash: string | null | undefined) {
  if (!pinHash?.startsWith(HASH_PREFIX)) return false;
  if (!isValidPin(pin)) return false;
  const expected = pinHash.slice(HASH_PREFIX.length);
  const current = digest(pin);
  const a = Buffer.from(expected);
  const b = Buffer.from(current);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
