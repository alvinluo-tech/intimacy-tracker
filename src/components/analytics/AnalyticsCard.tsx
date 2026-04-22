import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function AnalyticsCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ElementType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={["p-5 rounded-[20px] bg-[#1a1f2e] border-white/[0.02] transition-colors hover:bg-[#1f2536] hover:border-white/[0.05] group", className].filter(Boolean).join(" ")}>
      <div className="flex items-center gap-2 mb-4 text-[var(--app-text-muted)]">
        {Icon && <Icon className="h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:text-[var(--brand)] transition-all" />}
        <div className="text-[13px] font-medium tracking-wide uppercase">
          {title}
        </div>
      </div>
      <div className="mt-1">{children}</div>
    </Card>
  );
}
