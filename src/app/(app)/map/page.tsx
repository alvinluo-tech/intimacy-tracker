import { TopBar } from "@/components/layout/TopBar";
import { MapViewClient } from "@/components/map/MapViewClient";
import { listMapPoints } from "@/features/map/queries";

function normalizeDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const from = normalizeDate(sp.from);
  const to = normalizeDate(sp.to);
  const points = await listMapPoints({ from, to });

  return (
    <div className="flex h-[100svh] flex-col md:h-screen">
      <TopBar title="Map" />
      <div className="flex-1 px-4 py-5 md:p-6">
        <MapViewClient points={points} from={from} to={to} />
      </div>
    </div>
  );
}
