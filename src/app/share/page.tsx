import { redirect } from "next/navigation";

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string; url?: string }>;
}) {
  const params = await searchParams;
  const note = params.note || "";

  if (note || params.url) {
    const qs = new URLSearchParams();
    if (note) qs.set("note", note);
    if (params.url) qs.set("sharedUrl", params.url);
    redirect(`/timeline?${qs.toString()}`);
  }

  redirect("/timeline");
}
