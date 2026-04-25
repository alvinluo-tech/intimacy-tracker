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
    <Card className={["p-5 rounded-[20px] bg-slate-900 border-slate-800 transition-colors hover:bg-slate-800/80 hover:border-slate-700 shadow-sm shadow-black/20 group", className].filter(Boolean).join(" ")}>
      <div className="flex items-center gap-2 mb-4 text-slate-400">
        {Icon && <Icon className="h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:text-rose-500 transition-all" />}
        <div className="text-[12px] font-semibold tracking-wider uppercase">
          {title}
        </div>
      </div>
      <div className="mt-1">{children}</div>
    </Card>
  );
}
