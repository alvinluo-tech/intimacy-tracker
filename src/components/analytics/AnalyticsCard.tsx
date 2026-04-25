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
    <Card className={["p-5 rounded-[20px] bg-[#0f172a] border border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors group", className].filter(Boolean).join(" ")}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8b95a3] mb-3">
        {Icon && <Icon className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 group-hover:text-[#f43f5e] transition-all" />}
        <div>{title}</div>
      </div>
      <div>{children}</div>
    </Card>
  );
}
