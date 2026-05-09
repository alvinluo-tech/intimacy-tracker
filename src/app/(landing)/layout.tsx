"use client";

import type React from "react";
import type { Metadata } from "next";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <PwaInstallPrompt />
    </>
  );
}
