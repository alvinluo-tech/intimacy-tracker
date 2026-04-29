"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Gauge,
  List,
  Map,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function SidebarNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const items = [
    { href: "/dashboard", label: t("insights"), icon: Gauge },
    { href: "/timeline", label: t("timeline"), icon: List },
    { href: "/map", label: t("map"), icon: Map },
    { href: "/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/[0.05] bg-[var(--app-panel)] md:block">
      <div className="px-4 py-4">
        <div className="text-[12px] font-medium tracking-[-0.15px] text-[var(--app-text-subtle)]">
          {process.env.NEXT_PUBLIC_APP_NAME ?? "Intimacy Tracker"}
        </div>
      </div>
      <div className="px-2">
        {items.map((it) => {
          const active = pathname === it.href;
          const Icon = it.icon;

          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 rounded-[8px] px-3 py-2 text-[13px] font-medium tracking-[-0.13px] transition-colors",
                active
                  ? "bg-white/[0.04] text-[var(--app-text)]"
                  : "text-[var(--app-text-secondary)] hover:bg-white/[0.03]"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  active ? "text-[var(--brand-accent)]" : "text-[var(--app-text-subtle)]"
                )}
              />
              {it.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

