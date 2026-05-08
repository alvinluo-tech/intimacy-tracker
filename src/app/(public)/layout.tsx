import Link from "next/link";
import type React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-[440px] flex-col items-center justify-center px-6 py-12">
        {/* Brand logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <span className="font-semibold text-lg tracking-tight text-content">Encounter</span>
        </Link>

        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
