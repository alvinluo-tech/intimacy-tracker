import type React from "react";

import { cn } from "@/lib/utils/cn";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--app-border)] bg-white/[0.02] px-2.5 py-0.5 text-[12px] font-medium tracking-[-0.15px] text-[var(--app-text-secondary)]",
        className
      )}
      {...props}
    />
  );
}

