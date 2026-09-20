import { describe, it, expect } from "vitest";
import {
  encodeEncounterCursor,
  decodeEncounterCursor,
} from "@/lib/utils/encounter-cursor";

const UUID = "9b2f1a3c-4d5e-4f60-8a71-2b3c4d5e6f70";
const TS = "2026-01-05T10:00:00+00:00";

describe("encodeEncounterCursor", () => {
  it("joins started_at and id with ::", () => {
    expect(encodeEncounterCursor(TS, UUID)).toBe(`${TS}::${UUID}`);
  });
});

describe("decodeEncounterCursor", () => {
  it("round-trips a valid cursor", () => {
    const parsed = decodeEncounterCursor(encodeEncounterCursor(TS, UUID));
    expect(parsed).toEqual({ startedAt: TS, id: UUID });
  });

  it("returns null for a bare started_at without an id (the 22P02 regression)", () => {
    expect(decodeEncounterCursor(TS)).toBeNull();
  });

  it("returns null when the id part is not a uuid", () => {
    expect(decodeEncounterCursor(`${TS}::0`)).toBeNull();
    expect(decodeEncounterCursor(`${TS}::not-a-uuid`)).toBeNull();
  });

  it("returns null when the timestamp is not parseable", () => {
    expect(decodeEncounterCursor(`not-a-date::${UUID}`)).toBeNull();
  });

  it("returns null for empty/null input", () => {
    expect(decodeEncounterCursor(null)).toBeNull();
    expect(decodeEncounterCursor(undefined)).toBeNull();
    expect(decodeEncounterCursor("")).toBeNull();
  });

  it("handles timestamps that themselves contain colons", () => {
    const parsed = decodeEncounterCursor(encodeEncounterCursor("2026-01-05T10:00:00.123456+00:00", UUID));
    expect(parsed?.id).toBe(UUID);
    expect(parsed?.startedAt).toBe("2026-01-05T10:00:00.123456+00:00");
  });
});
