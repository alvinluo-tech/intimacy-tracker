import type React from "react";

import { cn } from "@/lib/utils/cn";

export function Notice({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-[var(--app-border-subtle)] bg-white/[0.02] px-4 py-3 text-[13px] leading-5 text-[var(--app-text-secondary)]",
        className
      )}
      {...props}
    />
  );
}
