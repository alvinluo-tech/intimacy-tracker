import { TopBar } from "@/components/layout/TopBar";
import { PinLockScreen } from "@/components/settings/PinLockScreen";
import { getPrivacySettings } from "@/features/privacy/queries";

export default async function LockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const settings = await getPrivacySettings();
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string"
      ? decodeURIComponent(params.next)
      : "/dashboard";

  return (
    <div className="min-h-[100svh]">
      {!settings.requirePin && <TopBar title="Lock" />}
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        {settings.requirePin ? (
          <PinLockScreen nextPath={nextPath} pinLength={settings.pinLength} />
        ) : (
          <div className="rounded-[12px] border border-[var(--app-border-subtle)] bg-white/[0.02] px-4 py-6 text-[13px] text-[var(--app-text-muted)]">
            你未开启 PIN 保护，可直接使用应用。
          </div>
        )}
      </div>
    </div>
  );
}
