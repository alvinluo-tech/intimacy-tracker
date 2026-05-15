'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Vote,
  Users,
  Settings,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Polls',
    href: '/admin/polls',
    icon: Vote,
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] shadow-sm"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-[#94a3b8]" />
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen transition-transform duration-300 bg-white dark:bg-[#020617] border-r border-gray-200 dark:border-white/[0.06]',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-white/[0.06]">
            {!collapsed && (
              <Link href="/admin" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">E</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-[#f8fafc]">
                  Admin
                </span>
              </Link>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
            >
              <ChevronLeft
                className={cn(
                  'w-4 h-4 text-gray-500 dark:text-[#94a3b8] transition-transform',
                  collapsed && 'rotate-180'
                )}
              />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = item.href === '/admin'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'text-gray-600 dark:text-[#94a3b8] hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-[#f8fafc]'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-white/[0.06]">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#94a3b8] hover:text-gray-900 dark:hover:text-[#f8fafc] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {!collapsed && <span>Back to Site</span>}
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
