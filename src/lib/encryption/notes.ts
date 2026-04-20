import "server-only";

import crypto from "node:crypto";

function getKey() {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("Missing ENCRYPTION_SECRET");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptNotes(plain: string) {
  const iv = crypto.randomBytes(12);
  const key = getKey();

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plain, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: ciphertext.toString("base64"),
  };
}

export function decryptNotes(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { v?: number; iv?: string; tag?: string; ct?: string };
  if (p.v !== 1 || !p.iv || !p.tag || !p.ct) return null;

  const key = getKey();
  const iv = Buffer.from(p.iv, "base64");
  const tag = Buffer.from(p.tag, "base64");
  const ct = Buffer.from(p.ct, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf8");
}

