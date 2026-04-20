import { TopBar } from "@/components/layout/TopBar";
import { PrivacySettingsForm } from "@/components/settings/PrivacySettingsForm";
import { getPrivacySettings } from "@/features/privacy/queries";

export default async function PrivacySettingsPage() {
  const settings = await getPrivacySettings();
  return (
    <div className="min-h-[100svh]">
      <TopBar title="Privacy" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <PrivacySettingsForm initial={settings} />
      </div>
    </div>
  );
}
