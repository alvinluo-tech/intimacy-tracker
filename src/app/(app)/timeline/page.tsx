import { Suspense } from "react";
import { TimelinePageView } from "@/components/timeline/TimelinePageView";
import { listEncounters, listPartners, listTags } from "@/features/records/queries";
import { TimelineSkeleton } from "./loading";

export default function TimelinePage() {
  return (
    <Suspense fallback={<TimelineSkeleton />}>
      <TimelinePageData />
    </Suspense>
  );
}

async function TimelinePageData() {
  const { data: items } = await listEncounters();
  const partners = await listPartners();
  const tags = await listTags();

  // Filter out any null/undefined items before passing to component
  const safeItems = items.filter((item): item is NonNullable<typeof items[number]> => item != null && item.id != null);

  return <TimelinePageView items={safeItems} partners={partners} tags={tags} />;
}
