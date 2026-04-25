import type React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-[var(--app-bg)] px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

