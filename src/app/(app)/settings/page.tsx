import { getPrivacySettings } from "@/features/privacy/queries";
import { SettingsView } from "@/components/settings/SettingsView";

export default async function SettingsPage() {
  const settings = await getPrivacySettings();
  
  return (
    <div className="min-h-[100svh] bg-[#11141d]">
      <SettingsView initial={settings} />
    </div>
  );
}

