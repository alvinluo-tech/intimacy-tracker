import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  isValidPin,
  isValidResetCode,
  hashPin,
  verifyPin,
  getHashPrefix,
  getPinLengthFromHash,
  hashResetCode,
  verifyResetCode,
} from "@/lib/auth/pin";

// Helper: create a v1 legacy hash (HMAC-SHA256) for testing backward compatibility
function makeV1Hash(pin: string): string {
  const secret = process.env.ENCRYPTION_SECRET!;
  const digest = createHmac("sha256", secret).update(pin).digest("hex");
  return `v1:${pin.length}:${digest}`;
}

describe("isValidPin", () => {
  it("accepts 4-digit PIN", () => {
    expect(isValidPin("1234")).toBe(true);
  });

  it("accepts 6-digit PIN", () => {
    expect(isValidPin("123456")).toBe(true);
  });

  it("accepts 5-digit PIN", () => {
    expect(isValidPin("12345")).toBe(true);
  });

  it("rejects 3-digit PIN", () => {
    expect(isValidPin("123")).toBe(false);
  });

  it("rejects 7-digit PIN", () => {
    expect(isValidPin("1234567")).toBe(false);
  });

  it("rejects non-numeric PIN", () => {
    expect(isValidPin("abcd")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidPin("")).toBe(false);
  });

  it("rejects PIN with letters mixed in", () => {
    expect(isValidPin("12a4")).toBe(false);
  });
});

describe("isValidResetCode", () => {
  it("accepts 6-digit code", () => {
    expect(isValidResetCode("123456")).toBe(true);
  });

  it("rejects 5-digit code", () => {
    expect(isValidResetCode("12345")).toBe(false);
  });

  it("rejects 7-digit code", () => {
    expect(isValidResetCode("1234567")).toBe(false);
  });

  it("rejects non-numeric code", () => {
    expect(isValidResetCode("abcdef")).toBe(false);
  });
});

describe("hashPin / verifyPin", () => {
  it("hashes and verifies a 4-digit PIN", () => {
    const hash = hashPin("1234");
    expect(verifyPin("1234", hash)).toBe(true);
  });

  it("hashes and verifies a 6-digit PIN", () => {
    const hash = hashPin("654321");
    expect(verifyPin("654321", hash)).toBe(true);
  });

  it("rejects wrong PIN", () => {
    const hash = hashPin("1234");
    expect(verifyPin("9999", hash)).toBe(false);
  });

  it("rejects null hash", () => {
    expect(verifyPin("1234", null)).toBe(false);
  });

  it("rejects undefined hash", () => {
    expect(verifyPin("1234", undefined)).toBe(false);
  });

  it("rejects invalid PIN format", () => {
    const hash = hashPin("1234");
    expect(verifyPin("abc", hash)).toBe(false);
  });

  it("produces v2 prefix", () => {
    const hash = hashPin("1234");
    expect(getHashPrefix(hash)).toBe("v2:");
  });

  it("returns null for unknown prefix", () => {
    expect(getHashPrefix("unknown:hash")).toBeNull();
  });
});

describe("v1 legacy hash support", () => {
  it("getHashPrefix recognizes v1 prefix", () => {
    expect(getHashPrefix("v1:4:abcdef1234567890")).toBe("v1:");
  });

  it("getPinLengthFromHash extracts length from v1 hash", () => {
    const hash = makeV1Hash("1234");
    expect(getPinLengthFromHash(hash)).toBe(4);
  });

  it("getPinLengthFromHash extracts 6-digit length from v1 hash", () => {
    const hash = makeV1Hash("123456");
    expect(getPinLengthFromHash(hash)).toBe(6);
  });

  it("getPinLengthFromHash returns null for v1 hash with invalid length", () => {
    expect(getPinLengthFromHash("v1:2:abcdef")).toBeNull();
    expect(getPinLengthFromHash("v1:abc:abcdef")).toBeNull();
  });

  it("getPinLengthFromHash returns null for v1 hash with wrong segment count", () => {
    expect(getPinLengthFromHash("v1:abcdef")).toBeNull();
  });

  it("verifyPin verifies correct v1 PIN", () => {
    const hash = makeV1Hash("1234");
    expect(verifyPin("1234", hash)).toBe(true);
  });

  it("verifyPin rejects wrong v1 PIN", () => {
    const hash = makeV1Hash("1234");
    expect(verifyPin("9999", hash)).toBe(false);
  });

  it("verifyPin rejects v1 PIN with wrong length", () => {
    const hash = makeV1Hash("1234");
    expect(verifyPin("12345", hash)).toBe(false);
  });

  it("verifyPin returns false for v1 hash with wrong segment count", () => {
    expect(verifyPin("1234", "v1:abcdef1234567890")).toBe(false);
  });
});

describe("getPinLengthFromHash", () => {
  it("extracts length from v2 hash", () => {
    const hash = hashPin("1234");
    expect(getPinLengthFromHash(hash)).toBe(4);
  });

  it("extracts length from 6-digit v2 hash", () => {
    const hash = hashPin("123456");
    expect(getPinLengthFromHash(hash)).toBe(6);
  });

  it("returns null for null input", () => {
    expect(getPinLengthFromHash(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(getPinLengthFromHash(undefined)).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(getPinLengthFromHash("garbage")).toBeNull();
  });
});

describe("hashResetCode / verifyResetCode", () => {
  it("hashes and verifies a reset code", () => {
    const hash = hashResetCode("123456");
    expect(verifyResetCode("123456", hash)).toBe(true);
  });

  it("rejects wrong reset code", () => {
    const hash = hashResetCode("123456");
    expect(verifyResetCode("654321", hash)).toBe(false);
  });

  it("rejects invalid code format", () => {
    expect(() => hashResetCode("12345")).toThrow();
  });

  it("rejects null stored hash", () => {
    expect(verifyResetCode("123456", null)).toBe(false);
  });

  it("rejects undefined stored hash", () => {
    expect(verifyResetCode("123456", undefined)).toBe(false);
  });

  it("rejects invalid code in verify", () => {
    expect(verifyResetCode("abc", "v2:reset:salt:hash")).toBe(false);
  });
});
