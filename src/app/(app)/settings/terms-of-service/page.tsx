import Link from "next/link";
import { ArrowLeft, FileText, ShieldAlert, Lock, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TermsOfServicePage() {
  const t = useTranslations("termsOfService");

  return (
    <div className="min-h-[100svh] bg-[#020617]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft size={16} />
          {t("backToSettings")}
        </Link>

        <div className="space-y-8">
          <div>
            <h1 className="text-[32px] font-light text-slate-100">{t("title")}</h1>
            <p className="mt-2 text-[14px] text-slate-500">{t("lastUpdated")}</p>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                  <FileText size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">{t("acceptanceOfTerms")}</h2>
              </div>
              <div className="text-[15px] text-slate-300 leading-relaxed">
                <p className="text-slate-400">{t("acceptanceOfTermsBody")}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                  <ShieldAlert size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">{t("eligibility")}</h2>
              </div>
              <div className="text-[15px] text-slate-300 leading-relaxed">
                <p className="text-slate-400">{t("eligibilityBody")}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                  <Lock size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">{t("userResponsibility")}</h2>
              </div>
              <div className="text-[15px] text-slate-300 leading-relaxed">
                <p className="text-slate-400">{t("userResponsibilityBody")}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                  <FileText size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">{t("dataOwnership")}</h2>
              </div>
              <div className="text-[15px] text-slate-300 leading-relaxed">
                <p className="text-slate-400">{t("dataOwnershipBody")}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                  <AlertTriangle size={20} />
                </div>
                <h2 className="text-[20px] font-light text-slate-100">{t("disclaimerOfLiability")}</h2>
              </div>
              <div className="text-[15px] text-slate-300 leading-relaxed">
                <p className="text-slate-400">{t("disclaimerOfLiabilityBody")}</p>
              </div>
            </section>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
            <p className="text-[13px] text-slate-500">
              {t("contactQuestion")}{" "}
              <a href="mailto:encounter.support@proton.me" className="text-rose-400 hover:text-rose-300">
                {t("contactEmail")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
