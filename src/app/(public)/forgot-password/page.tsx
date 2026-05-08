import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requestPasswordResetAction } from "@/features/auth/actions";
import { AuthField } from "@/components/auth/AuthField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Notice } from "@/components/ui/notice";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const email = typeof sp.email === "string" ? sp.email : "";
  const sent = sp.sent === "1";
  const t = await getTranslations("auth");

  return (
    <div className="space-y-6">
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-content transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToLogin")}
      </Link>

      <div className="text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
          <Mail className="h-7 w-7 text-primary/70" />
        </div>
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-content">
            {t("forgotPassword")}
          </h1>
          <p className="text-[14px] text-muted mt-2">{t("forgotPasswordSubtitle")}</p>
        </div>
      </div>

      {error && (
        <Notice className="border-destructive/45 bg-destructive/10 text-destructive-foreground text-sm">
          {error}
        </Notice>
      )}
      {sent && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-5 text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-success" />
          </div>
          <p className="text-[14px] font-medium text-success">
            {t("resetEmailSent")}
          </p>
          {email && (
            <p className="text-[12px] text-muted break-all">{email}</p>
          )}
        </div>
      )}

      {!sent && (
        <form action={requestPasswordResetAction} className="space-y-4">
          <AuthField
            id="email"
            name="email"
            label={t("emailLabel")}
            iconName="mail"
            type="email"
            autoComplete="email"
            defaultValue={email}
            placeholder={t("emailPlaceholder")}
            required
          />
          <SubmitButton className="h-12 w-full rounded-lg text-[15px]">
            {t("sendResetInstructions")}
          </SubmitButton>
        </form>
      )}

      <p className="text-center text-[14px] text-muted pb-4">
        {t("rememberPassword")}{" "}
        <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
