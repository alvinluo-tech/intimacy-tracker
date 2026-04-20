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
    <Card className={["p-4 md:p-5", className].filter(Boolean).join(" ")}>
      <div className="text-[13px] font-medium tracking-[-0.13px] text-[var(--app-text-secondary)]">
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}
