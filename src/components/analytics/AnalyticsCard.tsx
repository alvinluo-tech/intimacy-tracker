import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

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
    <Card className={cn("p-5 rounded-[20px] bg-surface border-border transition-colors group", className)}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-3">
        {Icon && <Icon className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 group-hover:text-primary transition-all" />}
        <div>{title}</div>
      </div>
      <div>{children}</div>
    </Card>
  );
}
