import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  PIN_UNLOCK_COOKIE,
  createPinUnlockToken,
  verifyPinUnlockToken,
} from "@/lib/auth/pin-session";

const USER_ID = "11111111-1111-1111-1111-111111111111";

describe("PIN_UNLOCK_COOKIE", () => {
  it("exports the correct cookie name", () => {
    expect(PIN_UNLOCK_COOKIE).toBe("it_pin_unlocked");
  });
});

describe("pin unlock token", () => {
  const origSecret = process.env.ENCRYPTION_SECRET;

  beforeEach(() => {
    process.env.ENCRYPTION_SECRET = "test-secret";
  });

  afterEach(() => {
    if (origSecret) process.env.ENCRYPTION_SECRET = origSecret;
    else delete process.env.ENCRYPTION_SECRET;
  });

  it("creates and verifies a valid token", async () => {
    const token = await createPinUnlockToken(USER_ID);
    expect(token).toBeTruthy();
    expect(await verifyPinUnlockToken(token, USER_ID)).toBe(true);
  });

  it("rejects a token for a different user", async () => {
    const token = await createPinUnlockToken(USER_ID);
    expect(await verifyPinUnlockToken(token, "22222222-2222-2222-2222-222222222222")).toBe(false);
  });

  it("rejects a forged token (static value no longer works)", async () => {
    expect(await verifyPinUnlockToken("1", USER_ID)).toBe(false);
    expect(await verifyPinUnlockToken(`${USER_ID}:99999999999999:deadbeef`, USER_ID)).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const token = await createPinUnlockToken(USER_ID);
    const parts = token!.split(":");
    const tampered = `${parts[0]}:${parts[1]}:${"f".repeat(parts[2].length)}`;
    expect(await verifyPinUnlockToken(tampered, USER_ID)).toBe(false);
  });

  it("rejects an expired token", async () => {
    // Recreate a token with an expiry in the past and a matching signature to
    // isolate the expiry check.
    const crypto = await import("node:crypto");
    const expiresAt = Date.now() - 1000;
    const sig = crypto
      .createHmac("sha256", "test-secret")
      .update(`pin-unlock:${USER_ID}:${expiresAt}`)
      .digest("hex");
    expect(await verifyPinUnlockToken(`${USER_ID}:${expiresAt}:${sig}`, USER_ID)).toBe(false);
  });

  it("fails closed without a signing secret", async () => {
    delete process.env.ENCRYPTION_SECRET;
    const token = await createPinUnlockToken(USER_ID);
    expect(token).toBeNull();
    expect(await verifyPinUnlockToken("anything", USER_ID)).toBe(false);
  });
});
