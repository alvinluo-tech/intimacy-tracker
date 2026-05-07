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
  if (user) {
    redirect("/dashboard");
  }
  // Show landing page for unauthenticated users
  const { default: LandingPage } = await import("./(landing)/page");
  return <LandingPage />;
}
