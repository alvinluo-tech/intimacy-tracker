import { Suspense } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { PinLockScreen } from "@/components/settings/PinLockScreen";
import { getPrivacySettings } from "@/features/privacy/queries";
import { getServerUser } from "@/features/auth/queries";
import { getTranslations } from "next-intl/server";
import { sanitizeRedirectPath } from "@/lib/utils/safe-redirect";

export default async function LockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const nextPath = sanitizeRedirectPath(sp.next, "/dashboard");
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading...</div>}>
      <LockPageData nextPath={nextPath} />
    </Suspense>
  );
}

async function LockPageData({
  nextPath,
}: {
  nextPath: string;
}) {
  const settings = await getPrivacySettings();
  const user = await getServerUser();
  const tc = await getTranslations("common");

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
        {/* The gate fails closed when the PIN setting cannot be read, so this
            screen is reachable by accounts that never set a PIN — they need a
            way on, not a dead end. */}
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-[8px] border border-border bg-surface px-4 text-[13px] font-medium transition-colors hover:bg-muted/10"
        >
          {tc("continue")}
        </Link>
      </div>
    </div>
  );
}
