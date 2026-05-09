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
          <img
            src="/icon-48.png"
            alt="Encounter"
            className="w-9 h-9 rounded-lg"
          />
          <span className="font-semibold text-lg tracking-tight text-content">Encounter</span>
        </Link>

        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
