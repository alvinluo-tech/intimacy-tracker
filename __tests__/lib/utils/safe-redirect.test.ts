import { describe, it, expect } from "vitest";
import { sanitizeRedirectPath } from "@/lib/utils/safe-redirect";

describe("sanitizeRedirectPath", () => {
  it("allows plain same-origin paths", () => {
    expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/records/abc?tab=notes")).toBe("/records/abc?tab=notes");
  });

  it("decodes encoded paths", () => {
    expect(sanitizeRedirectPath("%2Ftimeline")).toBe("/timeline");
  });

  it("rejects protocol-relative redirects", () => {
    expect(sanitizeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("%2F%2Fevil.com")).toBe("/dashboard");
  });

  it("rejects backslash protocol tricks", () => {
    expect(sanitizeRedirectPath("/\\evil.com")).toBe("/dashboard");
  });

  it("rejects external URLs", () => {
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/dashboard");
  });

  it("returns the fallback on malformed percent-encoding", () => {
    expect(sanitizeRedirectPath("100%")).toBe("/dashboard");
    expect(sanitizeRedirectPath("%ZZ")).toBe("/dashboard");
  });

  it("supports a custom fallback", () => {
    expect(sanitizeRedirectPath("//evil.com", "/home")).toBe("/home");
    expect(sanitizeRedirectPath(null, "/home")).toBe("/home");
  });
});
