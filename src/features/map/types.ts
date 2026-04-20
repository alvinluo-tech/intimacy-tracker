export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  startedAt: string;
  precision: "off" | "city" | "exact";
  locationLabel: string | null;
  city: string | null;
  country: string | null;
};
