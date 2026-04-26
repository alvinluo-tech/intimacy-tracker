"use client";

import { useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import type { ReactNode } from "react";
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail, UserRound } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type InputProps = ComponentPropsWithoutRef<"input">;
type IconName = "mail" | "key" | "user" | "lock";

const ICON_MAP = {
  mail: Mail,
  key: KeyRound,
  user: UserRound,
  lock: LockKeyhole,
} as const;

export function AuthField({
  label,
  iconName,
  rightLabel,
  type = "text",
  className,
  inputClassName,
  ...props
}: InputProps & {
  label: string;
  iconName: IconName;
  rightLabel?: ReactNode;
  inputClassName?: string;
}) {
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);
  const Icon = ICON_MAP[iconName];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={props.id}
          className="text-[15px] font-medium leading-6 text-[#88a7d1]"
        >
          {label}
        </label>
        {rightLabel}
      </div>

      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5f7ea8]" />
        <input
          {...props}
          type={isPassword && showPassword ? "text" : type}
          className={cn(
            "h-14 w-full rounded-[18px] border border-[#1f3860] bg-[#101f3e]/88 pl-12 pr-12 text-[16px] font-medium text-[#d5e6ff] placeholder:text-[#4f6690] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3e73]/40",
            "focus-visible:border-[#ff3e73]",
            inputClassName
          )}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6e88b4] transition hover:text-[#9eb5d6]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
