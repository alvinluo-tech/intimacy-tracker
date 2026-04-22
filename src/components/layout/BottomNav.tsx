"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Gauge,
  List,
  Map,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/dashboard", label: "总览", icon: Gauge },
  { href: "/timeline", label: "时间线", icon: List },
  { href: "/map", label: "地图", icon: Map },
  { href: "/settings", label: "设置", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.05] bg-[var(--app-panel)] md:hidden">
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
                  ? "text-[var(--brand-accent)]"
                  : "text-[var(--app-text-subtle)] hover:text-[var(--app-text-secondary)]"
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

