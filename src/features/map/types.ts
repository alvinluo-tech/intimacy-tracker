export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  startedAt: string;
  timezone: string | null;
  precision: "off" | "city" | "exact";
  locationLabel: string | null;
  city: string | null;
  country: string | null;
};

export type MapViewMode = "auto" | "heatmap" | "exact";
