"use client";

import { useTranslations } from "next-intl";

export function LetterToReader() {
  const t = useTranslations("about");

  return (
    <section className="flex min-h-[80vh] items-center justify-center px-4 py-16 md:px-6">
      <article className="letter-card relative w-full max-w-[760px] rounded-[30px] p-14 md:p-[56px_52px]">
        {/* Decorative inner border */}
        <div className="pointer-events-none absolute inset-[18px] rounded-[22px] border border-rose-200/20" />

        {/* Decorative blur */}
        <div className="absolute -right-20 -top-20 h-[220px] w-[220px] rounded-full bg-rose-300/10 blur-2xl" />

        {/* Pin badge */}
        <div className="absolute right-[34px] top-[28px] grid h-[42px] w-[42px] place-items-center rounded-full bg-rose-100/85 text-lg text-rose-400 shadow-[0_10px_28px_rgba(150,80,80,0.14)]">
          ✦
        </div>

        {/* Kicker */}
        <p className="mb-4 text-[13px] tracking-[0.35em] text-rose-400">
          {t("kicker")}
        </p>

        {/* Title */}
        <h2 className="mb-8 text-[clamp(26px,4vw,38px)] font-light leading-[1.18] tracking-[-0.04em] text-[#2f2926] dark:text-white">
          {t("letterTitle")}
        </h2>

        {/* Letter Body */}
        <div className="space-y-7 text-[17px] leading-[2] text-[#5f5650] dark:text-muted">
          <p>{t("letterGreeting")}</p>
          <p>{t("letterParagraph1")}</p>
          <p>{t("letterParagraph2")}</p>
          <p>{t("letterParagraph3")}</p>
          <p>{t("letterParagraph4")}</p>
          <p>{t("letterParagraph5")}</p>
        </div>

        {/* Footer */}
        <footer className="mt-11 border-t border-rose-200/20 pt-6">
          <p className="text-[14px] text-[#9a8e88] dark:text-zinc-400">{t("letterSignoff")}</p>
          <strong className="mt-2 block text-[17px] font-semibold text-[#5f5650]/90 dark:text-white/90">
            {t("letterSignature")}
          </strong>
        </footer>
      </article>
    </section>
  );
}
