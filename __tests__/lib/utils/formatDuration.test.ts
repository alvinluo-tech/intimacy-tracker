import { describe, it, expect } from "vitest";
import { formatDuration } from "@/lib/utils/formatDuration";

describe("formatDuration", () => {
  it("returns nullDisplay for null input", () => {
    expect(formatDuration(null)).toBe("Ongoing");
  });

  it("returns nullDisplay for 0", () => {
    expect(formatDuration(0)).toBe("Ongoing");
  });

  it("returns nullDisplay for negative values", () => {
    expect(formatDuration(-5)).toBe("Ongoing");
  });

  it("supports custom nullDisplay", () => {
    expect(formatDuration(null, "N/A")).toBe("N/A");
    expect(formatDuration(0, "---")).toBe("---");
  });

  it("formats seconds only", () => {
    expect(formatDuration(0.5)).toBe("30s");
    expect(formatDuration(0.1)).toBe("6s");
  });

  it("formats minutes only", () => {
    expect(formatDuration(1)).toBe("1m");
    expect(formatDuration(5)).toBe("5m");
    expect(formatDuration(59)).toBe("59m");
  });

  it("formats minutes with seconds", () => {
    expect(formatDuration(1.5)).toBe("1m 30s");
    expect(formatDuration(2.25)).toBe("2m 15s");
  });

  it("formats hours only", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(120)).toBe("2h");
  });

  it("formats hours with minutes", () => {
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(125)).toBe("2h 5m");
  });

  it("does not show seconds when hours are present", () => {
    expect(formatDuration(61)).toBe("1h 1m");
  });
});
