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

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const items = [
    { href: "/dashboard", label: t('overview'), icon: Gauge },
    { href: "/timeline", label: t('timeline'), icon: List },
    { href: "/map", label: t('map'), icon: Map },
    { href: "/settings", label: t('settings'), icon: Settings },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface md:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-4 px-2">
        {items.map((it) => {
          const active = pathname === it.href;
          const Icon = it.icon;

          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-col items-center gap-1 py-3 text-[11px] font-medium tracking-[-0.15px]",
                active
                  ? "text-primary"
                  : "text-muted hover:text-content"
              )}
            >
              <Icon className="h-5 w-5" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

