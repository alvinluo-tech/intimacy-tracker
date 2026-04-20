"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-[12px] font-medium tracking-[-0.15px] text-[var(--app-text-secondary)]",
        className
      )}
      {...props}
    />
  );
}

