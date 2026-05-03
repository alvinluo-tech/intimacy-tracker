import "server-only";

import crypto from "node:crypto";

const HKDF_INFO = Buffer.from("encounter-notes-v2", "utf8");

function deriveKeyV2(userId: string): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("Missing ENCRYPTION_SECRET");
  const salt = crypto.createHash("sha256").update(userId).digest();
  const ikm = Buffer.from(secret, "utf8");
  return Buffer.from(crypto.hkdfSync("sha256", ikm, salt, HKDF_INFO, 32));
}

function deriveKeyV1() {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("Missing ENCRYPTION_SECRET");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptNotes(plain: string, userId: string) {
  const iv = crypto.randomBytes(12);
  const key = deriveKeyV2(userId);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plain, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    v: 2,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: ciphertext.toString("base64"),
  };
}

export function decryptNotes(payload: unknown, userId?: string): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { v?: number; iv?: string; tag?: string; ct?: string };
  if (!p.iv || !p.tag || !p.ct) return null;

  let key: Buffer;
  if (p.v === 2 && userId) {
    key = deriveKeyV2(userId);
  } else if (p.v === 1 || (p.v === 2 && !userId)) {
    key = deriveKeyV1();
  } else {
    return null;
  }

  const iv = Buffer.from(p.iv, "base64");
  const tag = Buffer.from(p.tag, "base64");
  const ct = Buffer.from(p.ct, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf8");
}

export function isV1Encryption(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  return (payload as { v?: number }).v === 1;
}

export function reEncryptNotesV1ToV2(
  payload: unknown,
  userId: string
): { v: number; iv: string; tag: string; ct: string } | null {
  const plain = decryptNotes(payload, undefined);
  if (plain === null) return null;
  return encryptNotes(plain, userId);
}
