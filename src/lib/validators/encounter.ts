import { z } from "zod";

export const encounterSchema = z
  .object({
    partnerId: z.string().uuid().optional().nullable(),
    startedAt: z.string(),
    endedAt: z.string().optional().nullable(),
    durationMinutes: z.number().nonnegative().optional().nullable(),
    locationEnabled: z.boolean().default(false),
    locationPrecision: z.enum(["off", "city", "exact"]).default("off"),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    locationLabel: z.string().max(120).optional().nullable(),
    locationNotes: z.string().max(500).optional().nullable(),
    city: z.string().max(120).optional().nullable(),
    country: z.string().max(120).optional().nullable(),
    rating: z.number().int().min(1).max(5).optional().nullable(),
    mood: z.string().max(50).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    tagIds: z.array(z.string().uuid()).default([]),
    tagNames: z.array(z.string().min(1).max(50)).default([]),
    shareNotesWithPartner: z.boolean().optional().nullable(),
    photos: z.array(z.object({
      url: z.string(),
      isPrivate: z.boolean(),
    })).optional(),
  })
  .refine(
    (v) => {
      if (!v.endedAt) return true;
      return new Date(v.endedAt).getTime() >= new Date(v.startedAt).getTime();
    },
    { message: "endedAt must be >= startedAt", path: ["endedAt"] }
  );

export type EncounterFormValues = z.input<typeof encounterSchema>;
export type EncounterPayload = z.output<typeof encounterSchema>;

export const encounterFormSchema = encounterSchema;
