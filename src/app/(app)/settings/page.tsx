import { Suspense } from "react";
import { SettingsView } from "@/components/settings/SettingsView";
import { getPrivacySettings } from "@/features/privacy/queries";
import { getServerUser } from "@/features/auth/queries";
import { listManagePartners } from "@/features/partners/queries";
import { Geist } from "next/font/google";
import { SettingsSkeleton } from "./loading";

const geist = Geist({
  subsets: ["latin"],
});

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsPageData />
    </Suspense>
  );
}

async function SettingsPageData() {
  const [settings, user, partners] = await Promise.all([
    getPrivacySettings(),
    getServerUser(),
    listManagePartners(),
  ]);

  return (
    <div className={`${geist.className} min-h-[100svh] bg-app-bg`}>
      <SettingsView initial={settings} user={user} partners={partners} />
    </div>
  );
}

