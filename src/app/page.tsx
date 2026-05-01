import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getServerUser } from "@/features/auth/queries";

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading...</div>}>
      <HomeData />
    </Suspense>
  );
}

async function HomeData() {
  const user = await getServerUser();
  redirect(user ? "/dashboard" : "/login");
  return null;
}
