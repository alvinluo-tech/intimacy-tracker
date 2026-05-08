import { Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { VerifyEmailClient } from "@/components/auth/VerifyEmailClient";
import { Notice } from "@/components/ui/notice";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const sent = sp.sent === "1";
  const unverified = sp.unverified === "1";
  const fromRegister = sp.from === "register";
  const fromLoginUnverified = sp.reason === "login_unverified";
  const t = await getTranslations("auth");

  return (
    <div className="space-y-6">
      {(fromLoginUnverified || (fromRegister && unverified)) && (
        <Notice className="border-warning/50 bg-warning/10 text-sm">{t("verifyEmailNotice")}</Notice>
      )}

      <div className="text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
          <Mail className="h-7 w-7 text-primary/70" />
        </div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-content">
          {t("verifyYourEmail")}
        </h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <VerifyEmailClient
          initialEmail={email}
          initialError={error}
          initialSent={sent}
        />
      </div>
    </div>
  );
}
