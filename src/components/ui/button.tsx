"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "ghost" | "outline";
type Size = "md" | "sm";

export function Button({
  className,
  variant = "ghost",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[6px] border text-[13px] font-medium tracking-[-0.13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(113,112,255,0.4)] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-60",
        size === "sm" ? "h-8 px-3" : "h-10 px-4",
        variant === "primary" &&
          "border-transparent bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]",
        variant === "ghost" &&
          "border-[var(--app-border)] bg-white/[0.02] text-[var(--app-text)] hover:bg-white/[0.04]",
        variant === "outline" &&
          "border-[var(--app-border)] bg-transparent text-[var(--app-text)] hover:bg-white/[0.03]",
        className
      )}
      {...props}
    />
  );
}

