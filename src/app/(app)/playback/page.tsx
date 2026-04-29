import { PlaybackPageView } from "@/components/playback/PlaybackPageView";
import { listPlaybackEncounters } from "@/features/playback/queries";
import { listPartners } from "@/features/records/queries";

function normalizeDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default async function PlaybackPage({
  searchParams,
}: {
  searchParams: Promise<{ partnerId?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const partnerId = sp.partnerId;
  const from = normalizeDate(sp.from) || undefined;
  const to = normalizeDate(sp.to) || undefined;

  const [encounters, partners] = await Promise.all([
    listPlaybackEncounters({ partnerId, from, to }),
    listPartners(),
  ]);

  return (
    <div className="flex h-[100svh] flex-col md:h-screen">
      <div className="flex-1">
        <PlaybackPageView
          encounters={encounters}
          partners={partners as any[]}
          selectedPartnerId={partnerId}
          from={from}
          to={to}
        />
      </div>
    </div>
  );
}
