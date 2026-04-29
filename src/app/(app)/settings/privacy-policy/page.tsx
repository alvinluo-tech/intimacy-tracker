import Link from "next/link";
import { ArrowLeft, Shield, Lock, MapPin, Database } from "lucide-react";
import { useTranslations } from "next-intl";

export default function PrivacyPolicyPage() {
  const t = useTranslations("privacyPolicy");

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
                  <Database size={20} />
                </div>
                <h2 className="text-[20px] font-light text-content">{t("dataWeCollect")}</h2>
              </div>
              <div className="space-y-4 text-[15px] text-content leading-relaxed">
                <div>
                  <h3 className="mb-2 text-[16px] font-medium text-content">{t("personalInfo")}</h3>
                  <p className="text-muted">{t("personalInfoBody")}</p>
                </div>
                <div>
                  <h3 className="mb-2 text-[16px] font-medium text-content">{t("encounterData")}</h3>
                  <p className="text-muted">{t("encounterDataBody")}</p>
                </div>
                <div>
                  <h3 className="mb-2 text-[16px] font-medium text-content">{t("locationData")}</h3>
                  <p className="text-muted">{t("locationDataBody")}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                  <Shield size={20} />
                </div>
                <h2 className="text-[20px] font-light text-content">{t("howWeUseData")}</h2>
              </div>
              <div className="space-y-4 text-[15px] text-content leading-relaxed">
                <p className="text-muted">{t("howWeUseDataBody")}</p>
                <ul className="ml-4 list-disc space-y-2 text-muted">
                  <li>{t("useItem1")}</li>
                  <li>{t("useItem2")}</li>
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <Lock size={20} />
                </div>
                <h2 className="text-[20px] font-light text-content">{t("dataStorage")}</h2>
              </div>
              <div className="space-y-4 text-[15px] text-content leading-relaxed">
                <p className="text-muted">{t("dataStorageBody")}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
                  <MapPin size={20} />
                </div>
                <h2 className="text-[20px] font-light text-content">{t("thirdPartyServices")}</h2>
              </div>
              <div className="space-y-4 text-[15px] text-content leading-relaxed">
                <p className="text-muted">{t("thirdPartyServicesBody")}</p>
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
