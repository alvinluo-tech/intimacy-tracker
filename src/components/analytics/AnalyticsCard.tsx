import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function AnalyticsCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={["p-5 rounded-[20px] bg-[#1a1f2e] border-white/[0.02] transition-colors hover:bg-[#1f2536] hover:border-white/[0.05]", className].filter(Boolean).join(" ")}>
      <div className="text-[13px] font-medium tracking-wide text-[var(--app-text-muted)] uppercase mb-4">
        {title}
      </div>
      <div className="mt-1">{children}</div>
    </Card>
  );
}
