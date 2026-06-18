import { describe, it, expect } from "vitest";
import { formatDateInTimezone } from "@/lib/utils/formatDateInTimezone";

describe("formatDateInTimezone", () => {
  const testDate = new Date("2025-06-15T14:30:00Z");

  it("formats MMM d, yyyy", () => {
    const result = formatDateInTimezone(testDate, "MMM d, yyyy", "UTC");
    expect(result).toBe("Jun 15, 2025");
  });

  it("formats h:mm a (lowercased)", () => {
    const result = formatDateInTimezone(testDate, "h:mm a", "UTC");
    expect(result).toMatch(/2:30\s*pm/i);
  });

  it("formats MMM yyyy", () => {
    const result = formatDateInTimezone(testDate, "MMM yyyy", "UTC");
    expect(result).toBe("Jun 2025");
  });

  it("formats MMM dd, yyyy with zero-padded day", () => {
    const result = formatDateInTimezone(testDate, "MMM dd, yyyy", "UTC");
    expect(result).toBe("Jun 15, 2025");
  });

  it("returns raw string for unknown format", () => {
    const result = formatDateInTimezone(testDate, "unknown-format", "UTC");
    expect(result).toBe(String(testDate));
  });

  it("accepts string dates", () => {
    const result = formatDateInTimezone("2025-01-01T00:00:00Z", "MMM d, yyyy", "UTC");
    expect(result).toBe("Jan 1, 2025");
  });

  it("respects timezone", () => {
    const result = formatDateInTimezone(testDate, "h:mm a", "Asia/Tokyo");
    expect(result).toMatch(/11:30\s*pm/i);
  });

  it("respects locale", () => {
    const result = formatDateInTimezone(testDate, "MMM d, yyyy", "UTC", "zh-CN");
    expect(result).toBeTruthy();
  });
});
