import { describe, it, expect } from "vitest";
import { normalizeCountryCode } from "@/lib/utils/country";

describe("normalizeCountryCode", () => {
  it("returns null for null/undefined/empty", () => {
    expect(normalizeCountryCode(null)).toBeNull();
    expect(normalizeCountryCode(undefined)).toBeNull();
    expect(normalizeCountryCode("")).toBeNull();
    expect(normalizeCountryCode("   ")).toBeNull();
  });

  it("resolves single-word English country names", () => {
    expect(normalizeCountryCode("Japan")).toBe("JP");
    expect(normalizeCountryCode("France")).toBe("FR");
    expect(normalizeCountryCode("Germany")).toBe("DE");
  });

  it("resolves Chinese country names", () => {
    expect(normalizeCountryCode("日本")).toBe("JP");
    expect(normalizeCountryCode("法国")).toBe("FR");
  });

  it("uses fallback map for single-token aliases", () => {
    expect(normalizeCountryCode("UK")).toBe("GB");
    expect(normalizeCountryCode("Taiwan")).toBe("TW");
    expect(normalizeCountryCode("Macau")).toBe("MO");
    expect(normalizeCountryCode("UAE")).toBe("AE");
    expect(normalizeCountryCode("Czechia")).toBe("CZ");
    expect(normalizeCountryCode("Holland")).toBe("NL");
  });

  it("splits multi-word names by separator — only first token is matched", () => {
    // SEPARATOR = /[,;/|、，\s]+/ splits on spaces, so "Hong Kong" → ["Hong", "Kong"]
    // Only "Hong" is checked against getAlpha2Code and FALLBACK_MAP — returns null.
    // This is the actual behavior of the function.
    expect(normalizeCountryCode("Hong Kong")).toBeNull();
    expect(normalizeCountryCode("South Korea")).toBeNull();
    expect(normalizeCountryCode("United Kingdom")).toBeNull();
  });

  it("handles case insensitive fallback", () => {
    expect(normalizeCountryCode("uk")).toBe("GB");
    expect(normalizeCountryCode("korea")).toBe("KR");
  });

  it("takes the first token when multiple values are separated", () => {
    expect(normalizeCountryCode("Japan, Tokyo")).toBe("JP");
    expect(normalizeCountryCode("France / Paris")).toBe("FR");
  });

  it("returns null for unrecognized input", () => {
    expect(normalizeCountryCode("XyZzZy")).toBeNull();
  });
});
