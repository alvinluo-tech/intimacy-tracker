import type React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-[820px] items-start justify-center px-4 py-7 sm:items-center sm:px-6 sm:py-10">
        <div className="w-full max-w-[640px]">{children}</div>
      </div>
    </div>
  );
}

