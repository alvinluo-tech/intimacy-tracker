import { describe, it, expect } from "vitest";
import { encounterSchema } from "@/lib/validators/encounter";

describe("encounterSchema", () => {
  const validBase = {
    partnerId: "550e8400-e29b-41d4-a716-446655440000",
    startedAt: "2025-06-15T10:00:00Z",
  };

  it("accepts minimal valid input", () => {
    const result = encounterSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects invalid partnerId (not UUID)", () => {
    const result = encounterSchema.safeParse({ ...validBase, partnerId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects rating out of range", () => {
    const result = encounterSchema.safeParse({ ...validBase, rating: 6 });
    expect(result.success).toBe(false);
  });

  it("accepts rating 1-5", () => {
    for (let r = 1; r <= 5; r++) {
      const result = encounterSchema.safeParse({ ...validBase, rating: r });
      expect(result.success).toBe(true);
    }
  });

  it("rejects latitude out of range", () => {
    expect(encounterSchema.safeParse({ ...validBase, latitude: 91 }).success).toBe(false);
    expect(encounterSchema.safeParse({ ...validBase, latitude: -91 }).success).toBe(false);
  });

  it("rejects longitude out of range", () => {
    expect(encounterSchema.safeParse({ ...validBase, longitude: 181 }).success).toBe(false);
    expect(encounterSchema.safeParse({ ...validBase, longitude: -181 }).success).toBe(false);
  });

  it("rejects endedAt before startedAt", () => {
    const result = encounterSchema.safeParse({
      ...validBase,
      startedAt: "2025-06-15T10:00:00Z",
      endedAt: "2025-06-15T09:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("accepts endedAt equal to startedAt", () => {
    const result = encounterSchema.safeParse({
      ...validBase,
      startedAt: "2025-06-15T10:00:00Z",
      endedAt: "2025-06-15T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null endedAt", () => {
    const result = encounterSchema.safeParse({ ...validBase, endedAt: null });
    expect(result.success).toBe(true);
  });

  it("rejects notes exceeding 2000 chars", () => {
    const result = encounterSchema.safeParse({ ...validBase, notes: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("rejects locationLabel exceeding 500 chars", () => {
    const result = encounterSchema.safeParse({ ...validBase, locationLabel: "a".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("defaults tagIds and tagNames to empty arrays", () => {
    const result = encounterSchema.parse(validBase);
    expect(result.tagIds).toEqual([]);
    expect(result.tagNames).toEqual([]);
  });

  it("defaults locationEnabled to false", () => {
    const result = encounterSchema.parse(validBase);
    expect(result.locationEnabled).toBe(false);
  });

  it("defaults locationPrecision to off", () => {
    const result = encounterSchema.parse(validBase);
    expect(result.locationPrecision).toBe("off");
  });

  it("rejects invalid locationPrecision", () => {
    const result = encounterSchema.safeParse({ ...validBase, locationPrecision: "high" });
    expect(result.success).toBe(false);
  });

  it("accepts valid photos array", () => {
    const result = encounterSchema.safeParse({
      ...validBase,
      photos: [{ url: "https://example.com/photo.jpg", isPrivate: false }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative durationMinutes", () => {
    const result = encounterSchema.safeParse({ ...validBase, durationMinutes: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts null durationMinutes", () => {
    const result = encounterSchema.safeParse({ ...validBase, durationMinutes: null });
    expect(result.success).toBe(true);
  });
});
