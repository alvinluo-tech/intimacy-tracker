import { Skeleton } from "@/components/ui/skeleton";

export function SettingsSkeleton() {
  return (
    <div className="relative mx-auto max-w-4xl px-4 pb-24 pt-8 font-light md:px-6">
      {/* Header */}
      <div className="mb-8 space-y-1">
        <Skeleton className="h-[24px] w-[120px]" />
        <Skeleton className="h-[13px] w-[60px]" />
      </div>

      <div className="space-y-7">
        {/* Profile Card */}
        <div className="flex items-center gap-5 rounded-2xl border border-border bg-surface/80 p-6">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-[18px] w-[120px]" />
            <Skeleton className="h-[13px] w-[80px]" />
            <div className="flex gap-2">
              <Skeleton className="h-[26px] w-[70px] rounded-full" />
              <Skeleton className="h-[26px] w-[60px] rounded-full" />
            </div>
          </div>
        </div>

        {/* Section: Appearance */}
        <div className="space-y-3">
          <Skeleton className="h-[12px] w-[100px]" />
          <div className="rounded-2xl border border-border bg-surface/80 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5" />
                <div className="space-y-1">
                  <Skeleton className="h-[18px] w-[100px]" />
                  <Skeleton className="h-[14px] w-[140px]" />
                </div>
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          </div>
        </div>

        {/* Section: Partner Management */}
        <div className="space-y-3">
          <Skeleton className="h-[12px] w-[120px]" />
          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/80 p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-[18px] w-[120px]" />
                <Skeleton className="h-[14px] w-[80px]" />
              </div>
            </div>
            <Skeleton className="h-5 w-5" />
          </div>
        </div>

        {/* Section: Privacy & Security */}
        <div className="space-y-3">
          <Skeleton className="h-[12px] w-[130px]" />
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-surface/80 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5" />
                  <div className="space-y-1">
                    <Skeleton className="h-[18px] w-[80px]" />
                    <Skeleton className="h-[14px] w-[160px]" />
                  </div>
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-surface/80 p-4">
              <div className="mb-3 flex items-center gap-3">
                <Skeleton className="h-5 w-5" />
                <div className="space-y-1">
                  <Skeleton className="h-[18px] w-[120px]" />
                  <Skeleton className="h-[14px] w-[140px]" />
                </div>
              </div>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[52px] w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Language */}
        <div className="space-y-3">
          <Skeleton className="h-[12px] w-[80px]" />
          <div className="rounded-2xl border border-border bg-surface/80 p-4">
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <div className="space-y-1">
                <Skeleton className="h-[18px] w-[80px]" />
                <Skeleton className="h-[14px] w-[160px]" />
              </div>
            </div>
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>

        {/* Section: Date & Time */}
        <div className="space-y-3">
          <Skeleton className="h-[12px] w-[100px]" />
          <div className="rounded-2xl border border-border bg-surface/80 p-4">
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <div className="space-y-1">
                <Skeleton className="h-[18px] w-[80px]" />
                <Skeleton className="h-[14px] w-[160px]" />
              </div>
            </div>
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>

        {/* Section: Data Management */}
        <div className="space-y-3">
          <Skeleton className="h-[12px] w-[120px]" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-border bg-surface/80 p-4">
                <div className="space-y-1">
                  <Skeleton className="h-[18px] w-[100px]" />
                  <Skeleton className="h-[14px] w-[160px]" />
                </div>
                <Skeleton className="h-5 w-5" />
              </div>
            ))}
          </div>
        </div>

        {/* Section: About */}
        <div className="space-y-3">
          <Skeleton className="h-[12px] w-[60px]" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-border bg-surface/80 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-[18px] w-[100px]" />
                    <Skeleton className="h-[14px] w-[120px]" />
                  </div>
                </div>
                <Skeleton className="h-5 w-5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsLoading() {
  return <SettingsSkeleton />;
}
