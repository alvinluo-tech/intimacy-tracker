export type Tag = {
  id: string;
  name: string;
  color: string | null;
};

export type Partner = {
  id: string;
  nickname: string;
  color: string | null;
};

export type EncounterListItem = {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  rating: number | null;
  mood: string | null;
  location_enabled: boolean | null;
  location_label: string | null;
  city: string | null;
  country: string | null;
  partner: Partner | null;
  tags: Tag[];
};

export type EncounterDetail = EncounterListItem & {
  notes: string | null;
  location_precision: "off" | "city" | "exact" | null;
  latitude: number | null;
  longitude: number | null;
};

