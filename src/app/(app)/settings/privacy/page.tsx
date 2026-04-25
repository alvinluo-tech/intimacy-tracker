import { SettingsView } from "@/components/settings/SettingsView";
import { getPrivacySettings } from "@/features/privacy/queries";
import { getServerUser } from "@/features/auth/queries";
import { listManagePartners } from "@/features/partners/queries";

export default async function PrivacySettingsPage() {
  const [settings, user, partners] = await Promise.all([
    getPrivacySettings(),
    getServerUser(),
    listManagePartners(),
  ]);

  return (
    <div className="min-h-[100svh] bg-[#11141d]">
      <SettingsView initial={settings} user={user} partners={partners} />
    </div>
  );
}
