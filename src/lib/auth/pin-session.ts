export const PIN_UNLOCK_COOKIE = "it_pin_unlocked";
export const PIN_UNLOCK_TTL_SECONDS = 60 * 60 * 24; // 24 hours

const TOKEN_PAYLOAD_PREFIX = "pin-unlock";

function getSigningSecret(): string | null {
  return process.env.PIN_UNLOCK_SECRET || process.env.ENCRYPTION_SECRET || null;
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Creates an HMAC-signed, user-bound, expiring unlock token. Unlike a static
 * cookie value, it cannot be forged without the server secret and stops
 * working for a different user or after the TTL.
 * Returns null when no signing secret is configured (fail closed).
 */
export async function createPinUnlockToken(userId: string): Promise<string | null> {
  const secret = getSigningSecret();
  if (!secret || !userId) return null;
  const expiresAt = Date.now() + PIN_UNLOCK_TTL_SECONDS * 1000;
  const payload = `${TOKEN_PAYLOAD_PREFIX}:${userId}:${expiresAt}`;
  const signature = await hmacHex(payload, secret);
  return `${userId}:${expiresAt}:${signature}`;
}

/** Verifies signature, user binding and expiry of an unlock token. */
export async function verifyPinUnlockToken(
  token: string | undefined | null,
  userId: string
): Promise<boolean> {
  const secret = getSigningSecret();
  if (!secret || !token || !userId) return false;

  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [tokenUserId, expiresAtRaw, signature] = parts;
  if (tokenUserId !== userId) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = await hmacHex(`${TOKEN_PAYLOAD_PREFIX}:${tokenUserId}:${expiresAtRaw}`, secret);
  return constantTimeEqual(expected, signature);
}
