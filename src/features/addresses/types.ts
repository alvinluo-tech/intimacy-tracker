export type SavedAddress = {
  id: string;
  userId: string;
  alias: string;
  latitude: number;
  longitude: number;
  locationLabel: string | null;
  city: string | null;
  country: string | null;
  locationPrecision: "off" | "city" | "exact";
  createdAt: string;
};
