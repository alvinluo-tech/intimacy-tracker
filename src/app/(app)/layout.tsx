import type React from "react";
import { Suspense } from "react";

import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AppLayoutAuth>{children}</AppLayoutAuth>
    </Suspense>
  );
}

async function AppLayoutAuth({ children }: { children: React.ReactNode }) {
  const { cookies } = await import("next/headers");
  const { redirect } = await import("next/navigation");
  const { getServerUser } = await import("@/features/auth/queries");
  const { getPrivacySettings } = await import("@/features/privacy/queries");
  const { PIN_UNLOCK_COOKIE } = await import("@/lib/auth/pin-session");

  const user = await getServerUser();
  if (!user) redirect("/login");

  const privacy = await getPrivacySettings();
  const cookieStore = await cookies();
  const isUnlocked = cookieStore.get(PIN_UNLOCK_COOKIE)?.value === "1";

  return (
    <AppShell requirePin={privacy.requirePin} initialUnlocked={isUnlocked}>
      {children}
    </AppShell>
  );
}
