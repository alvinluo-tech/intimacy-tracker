"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "ghost" | "outline";
type Size = "md" | "sm";

export function Button({
  className,
  variant = "ghost",
  size = "md",
  isLoading = false,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[6px] border text-[13px] font-medium tracking-[-0.13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(113,112,255,0.4)] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-60",
        size === "sm" ? "h-8 px-3" : "h-10 px-4",
        variant === "primary" &&
          "border-transparent bg-primary text-white hover:bg-primary/90 shadow-sm",
        variant === "ghost" &&
          "border-border bg-surface/2 text-content hover:bg-muted/10",
        variant === "outline" &&
          "border-border bg-transparent text-content hover:bg-muted/10",
        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

