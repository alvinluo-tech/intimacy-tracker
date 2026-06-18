import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Set required env vars
process.env.RESEND_API_KEY = "test-api-key";
process.env.RESEND_FROM_EMAIL = "test@example.com";

describe("resend email", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sendSignupVerificationEmail", () => {
    it("sends verification email with correct params", async () => {
      const { sendSignupVerificationEmail } = await import("@/lib/email/resend");
      await sendSignupVerificationEmail("user@test.com", "https://example.com/verify");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.resend.com/emails");
      expect(options.method).toBe("POST");

      const body = JSON.parse(options.body);
      expect(body.from).toBe("test@example.com");
      expect(body.to).toEqual(["user@test.com"]);
      expect(body.subject).toContain("验证邮箱");
      expect(body.html).toContain("https://example.com/verify");
      expect(body.text).toContain("https://example.com/verify");
    });

    it("uses English locale when specified", async () => {
      const { sendSignupVerificationEmail } = await import("@/lib/email/resend");
      await sendSignupVerificationEmail("user@test.com", "https://example.com/verify", "en");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain("Verify your email");
    });

    it("throws on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        text: () => Promise.resolve("Invalid email"),
      });

      const { sendSignupVerificationEmail } = await import("@/lib/email/resend");
      await expect(
        sendSignupVerificationEmail("bad", "https://example.com/verify")
      ).rejects.toThrow("Resend send failed: 422");
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("sends password reset email", async () => {
      const { sendPasswordResetEmail } = await import("@/lib/email/resend");
      await sendPasswordResetEmail("user@test.com", "https://example.com/reset");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain("重置密码");
      expect(body.html).toContain("https://example.com/reset");
    });

    it("uses English locale", async () => {
      const { sendPasswordResetEmail } = await import("@/lib/email/resend");
      await sendPasswordResetEmail("user@test.com", "https://example.com/reset", "en");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain("Reset your password");
    });
  });

  describe("sendPinResetCodeEmail", () => {
    it("sends PIN reset code email", async () => {
      const { sendPinResetCodeEmail } = await import("@/lib/email/resend");
      await sendPinResetCodeEmail("user@test.com", "123456");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain("PIN 重置验证码");
      expect(body.html).toContain("123456");
      expect(body.text).toContain("123456");
    });

    it("uses English locale", async () => {
      const { sendPinResetCodeEmail } = await import("@/lib/email/resend");
      await sendPinResetCodeEmail("user@test.com", "654321", "en");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain("PIN Reset Code");
    });

    it("throws on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server error"),
      });

      const { sendPinResetCodeEmail } = await import("@/lib/email/resend");
      await expect(
        sendPinResetCodeEmail("user@test.com", "123456")
      ).rejects.toThrow("Resend send failed: 500");
    });
  });

  describe("getEmailConfig", () => {
    it("throws when RESEND_FROM_EMAIL is missing", async () => {
      const orig = process.env.RESEND_FROM_EMAIL;
      delete process.env.RESEND_FROM_EMAIL;

      const { sendSignupVerificationEmail } = await import("@/lib/email/resend");
      await expect(
        sendSignupVerificationEmail("user@test.com", "https://example.com/verify")
      ).rejects.toThrow("Missing RESEND_FROM_EMAIL");

      process.env.RESEND_FROM_EMAIL = orig;
    });
  });
});
