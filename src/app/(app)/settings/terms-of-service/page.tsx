import Link from "next/link";
import { ArrowLeft, FileText, ShieldAlert, Lock, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TermsOfServicePage() {
  const t = useTranslations("termsOfService");

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-2 text-muted transition-colors hover:text-content"
        >
          <ArrowLeft size={16} />
          {t("backToSettings")}
        </Link>

        <div className="space-y-8">
          <div>
            <h1 className="text-[32px] font-light text-content">{t("title")}</h1>
            <p className="mt-2 text-[14px] text-muted">{t("lastUpdated")}</p>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
                  <FileText size={20} />
                </div>
                <h2 className="text-[20px] font-light text-content">{t("acceptanceOfTerms")}</h2>
              </div>
              <div className="text-[15px] text-content leading-relaxed">
                <p className="text-muted">{t("acceptanceOfTermsBody")}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                  <ShieldAlert size={20} />
                </div>
                <h2 className="text-[20px] font-light text-content">{t("eligibility")}</h2>
              </div>
              <div className="text-[15px] text-content leading-relaxed">
                <p className="text-muted">{t("eligibilityBody")}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <Lock size={20} />
                </div>
                <h2 className="text-[20px] font-light text-content">{t("userResponsibility")}</h2>
              </div>
              <div className="text-[15px] text-content leading-relaxed">
                <p className="text-muted">{t("userResponsibilityBody")}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
                  <FileText size={20} />
                </div>
                <h2 className="text-[20px] font-light text-content">{t("dataOwnership")}</h2>
              </div>
              <div className="text-[15px] text-content leading-relaxed">
                <p className="text-muted">{t("dataOwnershipBody")}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/20 text-warning">
                  <AlertTriangle size={20} />
                </div>
                <h2 className="text-[20px] font-light text-content">{t("disclaimerOfLiability")}</h2>
              </div>
              <div className="text-[15px] text-content leading-relaxed">
                <p className="text-muted">{t("disclaimerOfLiabilityBody")}</p>
              </div>
            </section>
          </div>

          <div className="rounded-xl border border-border bg-surface/50 p-4 text-center">
            <p className="text-[13px] text-muted">
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
