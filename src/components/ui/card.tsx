import type React from "react";

import { cn } from "@/lib/utils/cn";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-[var(--app-border)] bg-white/[0.02] shadow-linear",
        className
      )}
      {...props}
    />
  );
}
