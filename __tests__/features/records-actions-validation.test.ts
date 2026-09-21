import { describe, it, expect, vi } from "vitest";

// /records/[id]/edit was dead for the same reason for months: the form payload
// omitted `climaxed`, the action called `encounterSchema.parse`, and the thrown
// ZodError surfaced as nothing at all — no toast, no field error, no save.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

import { encounterSchema } from "@/lib/validators/encounter";
import { updateEncounterAction, createEncounterAction } from "@/features/records/actions";

const ENCOUNTER_ID = "6f1d2b3c-0000-4000-8000-000000000001";
const PARTNER_ID = "2f1d2b3c-0000-4000-8000-000000000001";

/** Every key the edit form supplies — deliberately without `climaxed`. */
const formPayloadMissingOutcome = {
  partnerId: PARTNER_ID,
  startedAt: "2026-05-01T20:30:00.000Z",
  endedAt: null,
  durationMinutes: 42,
  locationEnabled: false,
  locationPrecision: "off",
  latitude: null,
  longitude: null,
  locationLabel: null,
  locationNotes: null,
  city: null,
  country: null,
  rating: null,
  mood: null,
  notes: null,
  tagIds: [] as string[],
  tagNames: [] as string[],
  shareNotesWithPartner: false,
  photos: [] as Array<{ url: string; isPrivate: boolean }>,
};

describe("encounter actions reject invalid payloads without throwing", () => {
  it("updateEncounterAction returns a typed error when the outcome field is missing", async () => {
    await expect(
      updateEncounterAction(ENCOUNTER_ID, formPayloadMissingOutcome)
    ).resolves.toEqual({ ok: false, error: "invalidData" });
  });

  it("createEncounterAction returns a typed error for the same payload", async () => {
    await expect(
      createEncounterAction(formPayloadMissingOutcome)
    ).resolves.toEqual({ ok: false, error: "invalidData" });
  });

  it("updateEncounterAction rejects a non-numeric rating instead of persisting it", async () => {
    await expect(
      updateEncounterAction(ENCOUNTER_ID, {
        ...formPayloadMissingOutcome,
        climaxed: true,
        rating: 9,
      })
    ).resolves.toEqual({ ok: false, error: "invalidData" });
  });
});

describe("encounterSchema accepts the payload the fixed edit form sends", () => {
  it("validates once the outcome field is present", () => {
    const result = encounterSchema.safeParse({
      ...formPayloadMissingOutcome,
      climaxed: false,
    });
    expect(result.success).toBe(true);
  });

  it("still requires the outcome field", () => {
    expect(encounterSchema.safeParse(formPayloadMissingOutcome).success).toBe(false);
  });
});
