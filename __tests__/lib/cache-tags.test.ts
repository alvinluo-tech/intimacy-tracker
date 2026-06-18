import { describe, it, expect } from "vitest";
import { CACHE_TAGS, REVALIDATE_PROFILE } from "@/lib/cache-tags";

describe("CACHE_TAGS", () => {
  it("generates dashboard tag with userId", () => {
    expect(CACHE_TAGS.dashboard("user-123")).toBe("dashboard-stats-user-123");
  });

  it("generates analytics tag with userId", () => {
    expect(CACHE_TAGS.analytics("user-123")).toBe("analytics-stats-user-123");
  });

  it("generates partnerList tag with userId", () => {
    expect(CACHE_TAGS.partnerList("user-123")).toBe("partner-list-user-123");
  });

  it("generates partnerDetail tag with partnerId", () => {
    expect(CACHE_TAGS.partnerDetail("partner-456")).toBe("partner-detail-partner-456");
  });

  it("generates timeline tag with userId", () => {
    expect(CACHE_TAGS.timeline("user-123")).toBe("timeline-user-123");
  });

  it("generates settings tag with userId", () => {
    expect(CACHE_TAGS.settings("user-123")).toBe("settings-user-123");
  });

  it("generates layout tag with userId", () => {
    expect(CACHE_TAGS.layout("user-123")).toBe("layout-user-123");
  });
});

describe("REVALIDATE_PROFILE", () => {
  it('is "seconds"', () => {
    expect(REVALIDATE_PROFILE).toBe("seconds");
  });
});
