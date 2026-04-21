import { TopBar } from "@/components/layout/TopBar";
import { QuickLogForm } from "@/components/forms/QuickLogForm";
import { listPartners, listTags } from "@/features/records/queries";
import { getPrivacySettings } from "@/features/privacy/queries";

export default async function NewLogPage() {
  const [partners, tags, privacy] = await Promise.all([
    listPartners(),
    listTags(),
    getPrivacySettings(),
  ]);

  return (
    <div className="min-h-[100svh]">
      <TopBar title="Quick Log" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <QuickLogForm
          mode="create"
          partners={partners}
          tags={tags}
          initial={{ locationPrecision: privacy.locationMode }}
        />
      </div>
    </div>
  );
}
