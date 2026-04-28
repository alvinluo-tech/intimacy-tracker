import { TopBar } from "@/components/layout/TopBar";
import { QuickLogForm } from "@/components/forms/QuickLogForm";
import { getEncounterDetail, listPartners, listTags } from "@/features/records/queries";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

export default async function RecordEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [detail, partners, tags] = await Promise.all([
    getEncounterDetail(id),
    listPartners(),
    listTags(),
  ]);

  if (!detail) {
    return (
      <div className="min-h-[100svh]">
        <TopBar title="Edit" showBack />
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
          <div className="rounded-[12px] border border-[var(--app-border-subtle)] bg-white/[0.02] px-4 py-6 text-[13px] text-[var(--app-text-muted)]">
            记录不存在或无权限。
          </div>
        </div>
      </div>
    );
  }

  const initialData = {
    partnerId: detail.partner?.id ?? undefined,
    startedAt: toLocalInput(detail.started_at),
    endedAt: detail.ended_at ? toLocalInput(detail.ended_at) : null,
    durationMinutes: detail.duration_minutes ?? null,
    locationEnabled: Boolean(detail.location_enabled),
    locationPrecision: detail.location_precision ?? "off",
    latitude: detail.latitude ?? null,
    longitude: detail.longitude ?? null,
    locationLabel: detail.location_label ?? null,
    locationNotes: detail.location_notes ?? null,
    city: detail.city ?? null,
    country: detail.country ?? null,
    rating: detail.rating ?? null,
    mood: detail.mood ?? null,
    notes: detail.notes ?? null,
    tagIds: detail.tags.map((t) => t.id),
    tagNames: [],
    shareNotesWithPartner: detail.share_notes_with_partner ?? false,
    photos: [],
  };

  console.log("Edit page rendering with id:", id, "initialData:", initialData);

  return (
    <div className="min-h-[100svh]">
      <TopBar title="Edit" showBack />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <QuickLogForm
          key={`edit-${id}-${Date.now()}`}
          mode="edit"
          encounterId={id}
          partners={partners}
          tags={tags}
          initial={initialData}
        />
      </div>
    </div>
  );
}
