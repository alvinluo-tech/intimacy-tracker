"use client";

import { useTranslations } from "next-intl";

export function LetterToReader() {
  const t = useTranslations("about");

  return (
    <section className="flex items-center justify-center px-4 pt-1 pb-16 md:px-6">
      <article className="letter-card relative w-full max-w-[760px] rounded-[30px] p-8 md:p-[48px_44px]">
        {/* Decorative inner border */}
        <div className="pointer-events-none absolute inset-[16px] rounded-[22px] border border-rose-200/20" />

        {/* Decorative blur */}
        <div className="absolute -right-20 -top-20 h-[220px] w-[220px] rounded-full bg-rose-300/10 blur-2xl" />

        {/* Pin badge */}
        <div className="absolute right-[22px] top-[22px] grid h-[38px] w-[38px] place-items-center rounded-full bg-rose-100/85 text-base text-rose-400 shadow-[0_10px_28px_rgba(150,80,80,0.14)] md:right-[26px] md:top-[26px] md:h-[42px] md:w-[42px] md:text-lg">
          ✦
        </div>

        {/* Header with Icon and Title */}
        <header className="mb-8 text-center relative z-10 pt-2">
          <img
            src="/icon-1254.png"
            alt="Encounter"
            className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-sm ring-1 ring-border/50"
          />
          <h1 className="mb-2 text-[28px] font-light tracking-[-0.03em] text-content md:text-[32px]">
            {t("title")}
          </h1>
          <p className="text-[14px] text-muted md:text-[15px]">{t("subtitle")}</p>
        </header>

        {/* Subtle Divider */}
        <div className="mb-8 h-px w-12 bg-rose-500/20" />

        {/* Kicker */}
        <p className="mb-4 text-[12px] tracking-[0.35em] text-rose-400 md:text-[13px]">
          {t("kicker")}
        </p>

        {/* Title */}
        <h2 className="mb-6 text-[clamp(24px,4vw,34px)] font-light leading-[1.18] tracking-[-0.04em] text-[#2f2926] dark:text-white">
          {t("letterTitle")}
        </h2>

        {/* Letter Body */}
        <div className="space-y-6 text-[15px] leading-[1.8] text-[#5f5650] dark:text-muted md:text-[16px] md:leading-[1.9]">
          <p>{t("letterGreeting")}</p>
          <p>{t("letterParagraph1")}</p>
          <p>{t("letterParagraph2")}</p>
          <p>{t("letterParagraph3")}</p>
          <p>{t("letterParagraph4")}</p>
          <p>{t("letterParagraph5")}</p>
        </div>

        {/* Footer */}
        <footer className="mt-8 border-t border-rose-200/20 pt-6 md:mt-10 md:pt-8">
          <p className="text-[13px] text-[#9a8e88] dark:text-zinc-400 md:text-[14px]">{t("letterSignoff")}</p>
          <strong className="mt-1 block text-[15px] font-semibold text-[#5f5650]/90 dark:text-white/90 md:text-[16px]">
            {t("letterSignature")}
          </strong>
        </footer>
      </article>
    </section>
  );
}
