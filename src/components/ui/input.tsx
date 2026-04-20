"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[6px] border border-[var(--app-border)] bg-white/[0.02] px-3 text-[14px] text-[var(--app-text)] placeholder:text-[var(--app-text-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(113,112,255,0.4)]",
        className
      )}
      {...props}
    />
  );
}

