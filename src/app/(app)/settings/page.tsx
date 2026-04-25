import { SettingsView } from "@/components/settings/SettingsView";
import { getPrivacySettings } from "@/features/privacy/queries";
import { getServerUser } from "@/features/auth/queries";
import { listManagePartners } from "@/features/partners/queries";
import { TopBar } from "@/components/layout/TopBar";

export default async function SettingsPage() {
  const [settings, user, partners] = await Promise.all([
    getPrivacySettings(),
    getServerUser(),
    listManagePartners(),
  ]);

  return (
    <div className="min-h-[100svh] bg-[#0b0f18]">
      <TopBar title="Settings" />
      <SettingsView initial={settings} user={user} partners={partners} />
    </div>
  );
}

