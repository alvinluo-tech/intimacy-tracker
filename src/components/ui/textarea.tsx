"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-[6px] border border-[var(--app-border)] bg-white/[0.02] px-3 py-2 text-[14px] font-medium text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(113,112,255,0.4)]",
        className
      )}
      {...props}
    />
  );
}

