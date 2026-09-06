import type React from "react";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerUser } from "@/features/auth/queries";
import { getPrivacySettings } from "@/features/privacy/queries";
import { PIN_UNLOCK_COOKIE, verifyPinUnlockToken } from "@/lib/auth/pin-session";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><Skeleton className="h-full w-full" /></div>}>
      <AppLayoutAuth>{children}</AppLayoutAuth>
    </Suspense>
  );
}

async function AppLayoutAuth({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const privacy = await getPrivacySettings();
  const cookieStore = await cookies();
  const isUnlocked = await verifyPinUnlockToken(
    cookieStore.get(PIN_UNLOCK_COOKIE)?.value,
    user.id
  );

  return (
    <AppShell requirePin={privacy.requirePin} initialUnlocked={isUnlocked}>
      {children}
    </AppShell>
  );
}
