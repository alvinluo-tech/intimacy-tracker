import { TopBar } from "@/components/layout/TopBar";
import { QuickLogForm } from "@/components/forms/QuickLogForm";
import { listPartners, listTags } from "@/features/records/queries";

export default async function NewLogPage() {
  const [partners, tags] = await Promise.all([listPartners(), listTags()]);

  return (
    <div className="min-h-[100svh]">
      <TopBar title="Quick Log" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <QuickLogForm mode="create" partners={partners} tags={tags} />
      </div>
    </div>
  );
}
