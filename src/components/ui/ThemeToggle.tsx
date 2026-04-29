"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const tp = useTranslations("settings");

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8 w-[120px] animate-pulse rounded-full bg-[var(--app-surface)]" />;
  }

  const options: Array<{ value: string; icon: React.ReactNode; label: string }> = [
    { value: "light", icon: <Sun className="h-4 w-4" />, label: tp("light") },
    { value: "dark", icon: <Moon className="h-4 w-4" />, label: tp("dark") },
    { value: "system", icon: <Monitor className="h-4 w-4" />, label: tp("system") },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          title={opt.label}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            theme === opt.value
              ? "bg-[var(--app-text)] text-[var(--app-bg)]"
              : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
          }`}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
