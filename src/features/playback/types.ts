import type { Partner } from "@/features/records/types";

export type PlaybackEncounter = {
  id: string;
  started_at: string;
  latitude: number;
  longitude: number;
  location_label: string | null;
  city: string | null;
  country: string | null;
  rating: number | null;
  duration_minutes: number | null;
  partner: Partner | null;
  tags: { id: string; name: string; color: string | null }[];
};
