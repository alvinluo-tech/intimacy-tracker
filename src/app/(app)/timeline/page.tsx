import { TimelinePageView } from "@/components/timeline/TimelinePageView";
import { listEncounters } from "@/features/records/queries";

export default async function TimelinePage() {
  const items = await listEncounters();

  return <TimelinePageView items={items} />;
}
