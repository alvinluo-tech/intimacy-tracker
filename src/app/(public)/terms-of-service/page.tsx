import Link from "next/link";
import { ArrowLeft, FileText, ShieldAlert, Lock, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function PublicTermsOfServicePage() {
  const t = useTranslations("termsOfService");

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-gray-500 dark:text-[#94a3b8] transition-colors hover:text-gray-900 dark:hover:text-[#f8fafc]"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div className="space-y-8">
          <div>
            <h1 className="text-[32px] font-light text-gray-900 dark:text-[#f8fafc]">{t("title")}</h1>
            <p className="mt-2 text-[14px] text-gray-500 dark:text-[#94a3b8]">{t("lastUpdated")}</p>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-500">
                  <FileText size={20} />
                </div>
                <h2 className="text-[20px] font-light text-gray-900 dark:text-[#f8fafc]">{t("acceptanceOfTerms")}</h2>
              </div>
              <div className="text-[15px] text-gray-900 dark:text-[#f8fafc] leading-relaxed">
                <p className="text-gray-500 dark:text-[#94a3b8]">{t("acceptanceOfTermsBody")}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                  <ShieldAlert size={20} />
                </div>
                <h2 className="text-[20px] font-light text-gray-900 dark:text-[#f8fafc]">{t("eligibility")}</h2>
              </div>
              <div className="text-[15px] text-gray-900 dark:text-[#f8fafc] leading-relaxed">
                <p className="text-gray-500 dark:text-[#94a3b8]">{t("eligibilityBody")}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-500">
                  <Lock size={20} />
                </div>
                <h2 className="text-[20px] font-light text-gray-900 dark:text-[#f8fafc]">{t("userResponsibility")}</h2>
              </div>
              <div className="text-[15px] text-gray-900 dark:text-[#f8fafc] leading-relaxed">
                <p className="text-gray-500 dark:text-[#94a3b8]">{t("userResponsibilityBody")}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-500">
                  <FileText size={20} />
                </div>
                <h2 className="text-[20px] font-light text-gray-900 dark:text-[#f8fafc]">{t("dataOwnership")}</h2>
              </div>
              <div className="text-[15px] text-gray-900 dark:text-[#f8fafc] leading-relaxed">
                <p className="text-gray-500 dark:text-[#94a3b8]">{t("dataOwnershipBody")}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/20 text-yellow-500">
                  <AlertTriangle size={20} />
                </div>
                <h2 className="text-[20px] font-light text-gray-900 dark:text-[#f8fafc]">{t("disclaimerOfLiability")}</h2>
              </div>
              <div className="text-[15px] text-gray-900 dark:text-[#f8fafc] leading-relaxed">
                <p className="text-gray-500 dark:text-[#94a3b8]">{t("disclaimerOfLiabilityBody")}</p>
              </div>
            </section>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.01] p-4 text-center">
            <p className="text-[13px] text-gray-500 dark:text-[#94a3b8]">
              {t("contactQuestion")}{" "}
              <a href="mailto:encounter.support@proton.me" className="text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300">
                {t("contactEmail")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
