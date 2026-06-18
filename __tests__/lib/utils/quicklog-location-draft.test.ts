import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage and window (functions check typeof window === "undefined")
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storage[key]; }),
  clear: vi.fn(() => { for (const k in storage) delete storage[k]; }),
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });
Object.defineProperty(globalThis, "window", { value: { localStorage: localStorageMock }, configurable: true });

describe("quicklog-location-draft", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("readQuickLogLocationDraft returns null when empty", async () => {
    const { readQuickLogLocationDraft } = await import("@/lib/utils/quicklog-location-draft");
    expect(readQuickLogLocationDraft()).toBeNull();
  });

  it("readQuickLogLocationDraft returns null for invalid JSON", async () => {
    storage["quicklog_location_draft"] = "not-json";
    const { readQuickLogLocationDraft } = await import("@/lib/utils/quicklog-location-draft");
    expect(readQuickLogLocationDraft()).toBeNull();
  });

  it("readQuickLogLocationDraft returns null for invalid locationPrecision", async () => {
    storage["quicklog_location_draft"] = JSON.stringify({ locationPrecision: "high" });
    const { readQuickLogLocationDraft } = await import("@/lib/utils/quicklog-location-draft");
    expect(readQuickLogLocationDraft()).toBeNull();
  });

  it("write and read roundtrip", async () => {
    const { writeQuickLogLocationDraft, readQuickLogLocationDraft } = await import("@/lib/utils/quicklog-location-draft");
    const draft = {
      latitude: 35.6762,
      longitude: 139.6503,
      locationLabel: "Tokyo",
      city: "Tokyo",
      country: "JP",
      locationPrecision: "city" as const,
      updatedAt: Date.now(),
      partnerId: null,
      moodIndex: null,
      rating: null,
      startTime: new Date().toISOString(),
      hours: 0,
      minutes: 0,
      seconds: 0,
      selectedTags: [],
      notes: "",
      shareNotesWithPartner: false,
      uploadedPhotos: [],
    };

    writeQuickLogLocationDraft(draft);
    const result = readQuickLogLocationDraft();
    expect(result).toBeTruthy();
    expect(result!.latitude).toBe(35.6762);
    expect(result!.locationPrecision).toBe("city");
  });

  it("clearQuickLogLocationDraft removes the key", async () => {
    const { writeQuickLogLocationDraft, clearQuickLogLocationDraft, readQuickLogLocationDraft } = await import("@/lib/utils/quicklog-location-draft");
    storage["quicklog_location_draft"] = JSON.stringify({ locationPrecision: "off" });
    clearQuickLogLocationDraft();
    expect(readQuickLogLocationDraft()).toBeNull();
  });

  it("consumeQuickLogReopenFlag returns false when no flag", async () => {
    const { consumeQuickLogReopenFlag } = await import("@/lib/utils/quicklog-location-draft");
    expect(consumeQuickLogReopenFlag()).toBe(false);
  });

  it("set and consume reopen flag roundtrip", async () => {
    const { setQuickLogReopenFlag, consumeQuickLogReopenFlag } = await import("@/lib/utils/quicklog-location-draft");
    setQuickLogReopenFlag();
    expect(consumeQuickLogReopenFlag()).toBe(true);
    // Flag should be consumed (removed)
    expect(consumeQuickLogReopenFlag()).toBe(false);
  });

  it("hasQuickLogReopenFlag checks flag existence", async () => {
    const { setQuickLogReopenFlag, hasQuickLogReopenFlag, consumeQuickLogReopenFlag } = await import("@/lib/utils/quicklog-location-draft");
    expect(hasQuickLogReopenFlag()).toBe(false);
    setQuickLogReopenFlag();
    expect(hasQuickLogReopenFlag()).toBe(true);
    consumeQuickLogReopenFlag();
    expect(hasQuickLogReopenFlag()).toBe(false);
  });

  it("readQuickLogLocationDraft applies defaults for missing fields", async () => {
    storage["quicklog_location_draft"] = JSON.stringify({
      latitude: 35.0,
      longitude: 139.0,
      locationPrecision: "exact",
      updatedAt: 1000,
    });
    const { readQuickLogLocationDraft } = await import("@/lib/utils/quicklog-location-draft");
    const result = readQuickLogLocationDraft();
    expect(result).toBeTruthy();
    expect(result!.partnerId).toBeNull();
    expect(result!.moodIndex).toBeNull();
    expect(result!.rating).toBeNull();
    expect(result!.hours).toBe(0);
    expect(result!.minutes).toBe(0);
    expect(result!.seconds).toBe(0);
    expect(result!.selectedTags).toEqual([]);
    expect(result!.notes).toBe("");
    expect(result!.shareNotesWithPartner).toBe(false);
    expect(result!.uploadedPhotos).toEqual([]);
  });
});
