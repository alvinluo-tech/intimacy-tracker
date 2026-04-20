import type React from "react";

import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getServerUser } from "@/features/auth/queries";
import { getPrivacySettings } from "@/features/privacy/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const privacy = await getPrivacySettings();

  return <AppShell requirePin={privacy.requirePin}>{children}</AppShell>;
}
