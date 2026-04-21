import type React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getServerUser } from "@/features/auth/queries";
import { getPrivacySettings } from "@/features/privacy/queries";
import { PIN_UNLOCK_COOKIE } from "@/lib/auth/pin-session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
