import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { updatePasswordAction } from "@/features/auth/actions";
import { AuthField } from "@/components/auth/AuthField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Notice } from "@/components/ui/notice";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
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
          <KeyRound className="h-7 w-7 text-primary/70" />
        </div>
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-content">
            {t("resetPassword")}
          </h1>
          <p className="text-[14px] text-muted mt-2">{t("newPasswordDescription")}</p>
        </div>
      </div>

      {error && (
        <Notice className="border-destructive/45 bg-destructive/10 text-destructive-foreground text-sm">
          {error}
        </Notice>
      )}

      <form action={updatePasswordAction} className="space-y-4">
        <AuthField
          id="password"
          name="password"
          label={t("newPassword")}
          iconName="key"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="••••••••"
        />
        <AuthField
          id="confirmPassword"
          name="confirmPassword"
          label={t("confirmPassword")}
          iconName="lock"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="••••••••"
        />
        <SubmitButton className="h-12 w-full rounded-lg text-[15px]">
          {t("resetPassword")}
        </SubmitButton>
      </form>
    </div>
  );
}
