import { z } from "zod";

const MAX_PHOTOS = 10;
const MAX_DURATION_MINUTES = 7 * 24 * 60; // one week

export const encounterSchema = z
  .object({
    partnerId: z.string().uuid(),
    startedAt: z.string().min(10).max(40),
    endedAt: z.string().min(10).max(40).optional().nullable(),
    durationMinutes: z
      .number()
      .nonnegative()
      .max(MAX_DURATION_MINUTES)
      .optional()
      .nullable(),
    locationEnabled: z.boolean().default(false),
    locationPrecision: z.enum(["off", "city", "exact"]).default("off"),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    locationLabel: z.string().max(500).optional().nullable(),
    locationNotes: z.string().max(500).optional().nullable(),
    city: z.string().max(120).optional().nullable(),
    country: z.string().max(120).optional().nullable(),
    rating: z.number().int().min(1).max(5).optional().nullable(),
    mood: z.string().max(50).optional().nullable(),
    climaxed: z.boolean(),
    notes: z.string().max(2000).optional().nullable(),
    tagIds: z.array(z.string().uuid()).max(50).default([]),
    tagNames: z.array(z.string().min(1).max(50)).max(30).default([]),
    shareNotesWithPartner: z.boolean().optional().nullable(),
    photos: z.array(z.object({
      url: z.string().min(1).max(2048),
      isPrivate: z.boolean(),
    })).max(MAX_PHOTOS).optional(),
  })
  .refine((v) => !Number.isNaN(new Date(v.startedAt).getTime()), {
    message: "startedAt must be a valid date", path: ["startedAt"],
  })
  .refine(
    (v) => {
      if (!v.endedAt) return true;
      const end = new Date(v.endedAt).getTime();
      const start = new Date(v.startedAt).getTime();
      return !Number.isNaN(end) && !Number.isNaN(start) && end >= start;
    },
    { message: "endedAt must be >= startedAt", path: ["endedAt"] }
  );

export type EncounterFormValues = z.input<typeof encounterSchema>;
export type EncounterPayload = z.output<typeof encounterSchema>;

export const encounterFormSchema = encounterSchema;
