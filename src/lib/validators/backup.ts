import { z } from "zod";

import { BACKUP_ENVELOPE_FORMAT } from "@/lib/crypto/backup-crypto";

export const EXPORT_SCHEMA_VERSION = 1;

export const MAX_IMPORT_ENCOUNTERS = 10_000;
export const MAX_IMPORT_PARTNERS = 1_000;
export const MAX_IMPORT_TAGS = 500;

/**
 * The client-side envelope wrapping an encrypted export. Recognized by the
 * restore flow to ask for a passphrase; never sent to the server decrypted.
 */
export const backupEnvelopeSchema = z.object({
  format: z.literal(BACKUP_ENVELOPE_FORMAT),
  format_version: z.number().int().positive(),
  kdf: z.object({
    name: z.string(),
    hash: z.string(),
    iterations: z.number().int().positive(),
    salt: z.string(),
  }),
  cipher: z.string(),
  iv: z.string(),
  ct: z.string(),
  created_at: z.string(),
});

const isoDatetime = z.string().datetime({ offset: true });

export const backupPartnerSchema = z.object({
  id: z.string().uuid(),
  nickname: z.string().min(1).max(100),
  color: z.string().max(32).nullable().optional(),
  avatar_url: z.string().max(2048).nullable().optional(),
  is_default: z.boolean().nullable().optional(),
  source: z.enum(["local", "bound"]).nullable().optional(),
  bound_user_id: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "past", "archived"]).nullable().optional(),
});

export const backupTagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  color: z.string().max(32).nullable().optional(),
});

export const backupPhotoSchema = z.object({
  path: z.string().min(1).max(2048),
  is_private: z.boolean().nullable().optional(),
});

export const backupEncounterSchema = z.object({
  id: z.string().uuid(),
  started_at: isoDatetime,
  ended_at: isoDatetime.nullable().optional(),
  duration_minutes: z.number().nonnegative().nullable().optional(),
  timezone: z.string().max(64).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  mood: z.string().max(100).nullable().optional(),
  climaxed: z.boolean().nullable().optional(),
  location_enabled: z.boolean().nullable().optional(),
  location_precision: z.enum(["off", "city", "exact"]).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  location_label: z.string().max(500).nullable().optional(),
  location_notes: z.string().max(2000).nullable().optional(),
  city: z.string().max(200).nullable().optional(),
  country: z.string().max(200).nullable().optional(),
  partner_id: z.string().uuid().nullable().optional(),
  partner_nickname: z.string().max(100).nullable().optional(),
  share_notes_with_partner: z.boolean().nullable().optional(),
  /** Plaintext notes; re-encrypted server-side with the importing user's key. */
  notes: z.string().max(20_000).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(50).optional(),
  photos: z.array(backupPhotoSchema).max(50).optional(),
});

/**
 * The `schema_version: 1` full export (plain JSON). The restore flow accepts
 * this directly (it is what /api/export-json returns) as well as a decrypted
 * encrypted backup, which uses the same inner shape.
 */
export const importPayloadSchema = z.object({
  schema_version: z.literal(EXPORT_SCHEMA_VERSION),
  exported_at: z.string().max(64),
  app: z.string().max(64).optional(),
  profile: z.object({ timezone: z.string().max(64).nullable().optional() }).optional(),
  partners: z.array(backupPartnerSchema).max(MAX_IMPORT_PARTNERS).optional(),
  tags: z.array(backupTagSchema).max(MAX_IMPORT_TAGS).optional(),
  encounters: z.array(backupEncounterSchema).max(MAX_IMPORT_ENCOUNTERS),
});

export type ImportPayload = z.infer<typeof importPayloadSchema>;
export type BackupEncounterInput = z.infer<typeof backupEncounterSchema>;
export type BackupPartnerInput = z.infer<typeof backupPartnerSchema>;
