import { describe, it, expect } from "vitest";

import {
  backupEnvelopeSchema,
  importPayloadSchema,
  MAX_IMPORT_ENCOUNTERS,
} from "@/lib/validators/backup";

const UUID = "9b2f1a3c-4d5e-4f60-8a71-2b3c4d5e6f70";

function validPayload(overrides?: Record<string, unknown>) {
  return {
    schema_version: 1,
    exported_at: "2026-09-22T12:00:00.000Z",
    app: "encounter",
    profile: { timezone: "UTC" },
    partners: [
      { id: UUID, nickname: "Alice", color: "#ff0000", status: "active" },
    ],
    tags: [{ id: UUID, name: "romantic" }],
    encounters: [
      {
        id: UUID,
        started_at: "2026-01-05T02:00:00.000Z",
        ended_at: null,
        duration_minutes: 30,
        timezone: "Asia/Shanghai",
        rating: 4,
        mood: "Happy",
        climaxed: true,
        location_enabled: true,
        location_precision: "city",
        latitude: 31.2,
        longitude: 121.5,
        city: "Shanghai",
        country: "China",
        partner_id: UUID,
        share_notes_with_partner: false,
        notes: "私密笔记",
        tags: ["romantic"],
        photos: [{ path: `${UUID}/photo.jpg`, is_private: false }],
      },
    ],
    ...overrides,
  };
}

describe("importPayloadSchema", () => {
  it("accepts a valid full export", () => {
    const result = importPayloadSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  it("rejects unknown schema versions", () => {
    const result = importPayloadSchema.safeParse(validPayload({ schema_version: 2 }));
    expect(result.success).toBe(false);
  });

  it("rejects encounters with malformed ids or timestamps", () => {
    const payload = validPayload();
    (payload.encounters as Array<Record<string, unknown>>)[0].id = "not-a-uuid";
    expect(importPayloadSchema.safeParse(payload).success).toBe(false);

    const badTime = validPayload();
    (badTime.encounters as Array<Record<string, unknown>>)[0].started_at = "yesterday";
    expect(importPayloadSchema.safeParse(badTime).success).toBe(false);
  });

  it("rejects out-of-range ratings and coordinates", () => {
    const payload = validPayload();
    (payload.encounters as Array<Record<string, unknown>>)[0].rating = 6;
    expect(importPayloadSchema.safeParse(payload).success).toBe(false);

    const coords = validPayload();
    (coords.encounters as Array<Record<string, unknown>>)[0].latitude = 999;
    expect(importPayloadSchema.safeParse(coords).success).toBe(false);
  });

  it("rejects payloads with more encounters than the cap", () => {
    const many = Array.from({ length: MAX_IMPORT_ENCOUNTERS + 1 }, () => ({
      id: UUID,
      started_at: "2026-01-05T02:00:00.000Z",
    }));
    const payload = validPayload({ encounters: many });
    expect(importPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it("allows an export with no partners or tags", () => {
    const payload = validPayload({ partners: [], tags: [] });
    (payload.encounters as Array<Record<string, unknown>>)[0].partner_id = null;
    const result = importPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

describe("backupEnvelopeSchema", () => {
  it("accepts a well-formed encrypted envelope", () => {
    const result = backupEnvelopeSchema.safeParse({
      format: "encounter-backup",
      format_version: 1,
      kdf: { name: "PBKDF2", hash: "SHA-256", iterations: 600000, salt: "c2FsdA==" },
      cipher: "AES-256-GCM",
      iv: "aXY=",
      ct: "Y3Q=",
      created_at: "2026-09-22T12:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a plain export masquerading as an envelope", () => {
    const result = backupEnvelopeSchema.safeParse(validPayload());
    expect(result.success).toBe(false);
  });
});
