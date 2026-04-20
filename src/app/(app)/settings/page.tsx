import Link from "next/link";

import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="min-h-[100svh]">
      <TopBar title="Settings" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <Card className="p-5">
          <div className="text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">
            设置
          </div>
          <div className="mt-2 text-[13px] leading-5 text-[var(--app-text-muted)]">
            <div>
              <Link
                href="/settings/privacy"
                className="text-[var(--brand-accent)] hover:text-[var(--brand-hover)]"
              >
                隐私设置
              </Link>
            </div>
            <div className="mt-1">
              <Link
                href="/settings/export"
                className="text-[var(--brand-accent)] hover:text-[var(--brand-hover)]"
              >
                数据导出
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

