import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Encounter - Private Intimacy Tracker",
  description: "Beautiful, privacy-first intimacy tracking for couples. Map your journey, analyze patterns, and connect deeper.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
