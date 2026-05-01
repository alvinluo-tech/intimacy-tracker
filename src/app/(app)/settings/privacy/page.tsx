import { Suspense } from "react";
import { SettingsView } from "@/components/settings/SettingsView";
import { getPrivacySettings } from "@/features/privacy/queries";
import { getServerUser } from "@/features/auth/queries";
import { listManagePartners } from "@/features/partners/queries";
import { Geist } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
});

export default function PrivacySettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading...</div>}>
      <PrivacySettingsPageData />
    </Suspense>
  );
}

async function PrivacySettingsPageData() {
  const [settings, user, partners] = await Promise.all([
    getPrivacySettings(),
    getServerUser(),
    listManagePartners(),
  ]);

  return (
    <div className={`${geist.className} min-h-[100svh] bg-background`}>
      <SettingsView initial={settings} user={user} partners={partners} />
    </div>
  );
}
