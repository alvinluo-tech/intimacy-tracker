import { TopBar } from "@/components/layout/TopBar";
import { PinLockScreen } from "@/components/settings/PinLockScreen";
import { getPrivacySettings } from "@/features/privacy/queries";
import { getServerUser } from "@/features/auth/queries";
import { getTranslations } from "next-intl/server";

export default async function LockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const settings = await getPrivacySettings();
  const user = await getServerUser();
  const params = await searchParams;
  const tc = await getTranslations("common");
  const nextPath =
    typeof params.next === "string"
      ? decodeURIComponent(params.next)
      : "/dashboard";

  if (settings.requirePin) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center px-4">
        <PinLockScreen nextPath={nextPath} pinLength={settings.pinLength} userEmail={user?.email ?? ""} />
      </div>
    );
  }

  return (
    <div className="min-h-[100svh]">
      <TopBar title={tc("lock")} />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <div className="rounded-[12px] border border-border bg-muted/5 px-4 py-6 text-[13px] text-[var(--app-text-muted)]">
          {tc("pinNotEnabled")}
        </div>
      </div>
    </div>
  );
}
