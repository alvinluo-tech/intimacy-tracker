"use client";

import {
  ArrowLeft,
  ShieldCheck,
  Ban,
  Target,
  Trash2,
  Lock,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { LetterToReader } from "@/components/about/LetterToReader";

const privacyIcons = {
  dataBelongsToYou: ShieldCheck,
  noJudgment: Ban,
  noAnxiety: Target,
  deleteAnytime: Trash2,
  dataEncrypted: Lock,
  openSource: Globe,
};

export default function AboutPage() {
  const t = useTranslations("about");

  return (
    <div className="about-bg min-h-screen">
      <div className="relative mx-auto max-w-3xl px-4 py-8 md:px-6">
        <Link
          href="/settings"
          className="group mb-6 inline-flex items-center gap-2 text-muted transition-all duration-200 hover:-translate-x-0.5 hover:text-rose-400"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span className="text-[14px]">{t("backToSettings")}</span>
        </Link>
      </div>

      {/* Developer Intro */}
      <section className="px-4 pt-8 pb-6 md:px-6">
        <div className="mx-auto max-w-[760px] text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-purple-500 text-3xl text-white shadow-xl">
            E
          </div>
          <h1 className="mb-3 text-[32px] font-light tracking-[-0.03em] text-content">
            {t("title")}
          </h1>
          <p className="text-[15px] text-muted">{t("subtitle")}</p>
        </div>
      </section>

      {/* Letter to Reader */}
      <LetterToReader />

      {/* Privacy Promise */}
      <section className="px-4 py-16 md:px-6">
        <div className="mx-auto max-w-[760px]">
          <h3 className="mb-8 text-center text-[22px] font-light text-content">
            {t("privacyTitle")}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              Object.keys(privacyIcons) as Array<keyof typeof privacyIcons>
            ).map((key) => {
              const Icon = privacyIcons[key];
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-border bg-surface/60 p-5 transition-colors hover:border-rose-400/30"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-rose-400/10">
                    <Icon className="h-[18px] w-[18px] text-rose-400" />
                  </div>
                  <p className="text-[14px] font-medium text-content">
                    {t(`privacyCards.${key}.title`)}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    {t(`privacyCards.${key}.description`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
