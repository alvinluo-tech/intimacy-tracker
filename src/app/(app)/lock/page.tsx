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
    <div className="min-h-[100svh] bg-black">
      <div className="mx-auto flex min-h-[100svh] max-w-6xl items-center justify-center px-4 py-8">
        {settings.requirePin ? (
          <PinLockScreen nextPath={nextPath} pinLength={settings.pinLength} />
        ) : null}
      </div>
    </div>
  );
}
