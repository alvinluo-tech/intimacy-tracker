import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { signUpAction, signInWithGoogleAction } from "@/features/auth/actions";
import { AuthField } from "@/components/auth/AuthField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Notice } from "@/components/ui/notice";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const t = await getTranslations("auth");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-content">
          {t("createAccount")}
        </h1>
        <p className="text-[15px] text-muted">{t("signUpSubtitle")}</p>
      </div>

      {error && (
        <Notice className="border-destructive/45 bg-destructive/10 text-destructive-foreground text-sm">
          {error}
        </Notice>
      )}

      {/* Google sign-up */}
      <form action={signInWithGoogleAction}>
        <SubmitButton
          variant="ghost"
          className="h-12 w-full rounded-lg border border-border bg-surface font-medium text-[15px] text-content hover:bg-surface/80"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {t("continueWithGoogle")}
        </SubmitButton>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[12px] font-medium uppercase tracking-widest text-muted">
          {t("or")}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Email registration */}
      <form action={signUpAction} className="space-y-4">
        <AuthField
          id="fullName"
          name="fullName"
          label={t("fullName")}
          iconName="user"
          autoComplete="name"
          placeholder={t("fullNamePlaceholder")}
        />
        <AuthField
          id="email"
          name="email"
          label={t("emailLabel")}
          iconName="mail"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          required
        />
        <AuthField
          id="password"
          name="password"
          label={t("password")}
          iconName="key"
          type="password"
          autoComplete="new-password"
          placeholder={t("signUpPasswordPlaceholder")}
          minLength={8}
          required
        />
        <AuthField
          id="confirmPassword"
          name="confirmPassword"
          label={t("confirmPasswordLabel")}
          iconName="lock"
          type="password"
          autoComplete="new-password"
          placeholder={t("confirmPasswordPlaceholder")}
          minLength={8}
          required
        />
        <PasswordStrength />

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="mt-0.5 h-4 w-4 rounded border-border bg-surface text-primary accent-primary"
          />
          <span className="text-[13px] text-muted leading-snug">
            {t("agreeTerms")}{" "}
            <Link href="/settings/terms-of-service" className="text-primary hover:underline">
              {t("termsOfService")}
            </Link>{" "}
            {t("and")}{" "}
            <Link href="/settings/privacy-policy" className="text-primary hover:underline">
              {t("privacyPolicy")}
            </Link>
          </span>
        </label>

        <SubmitButton className="h-12 w-full rounded-lg text-[15px]">
          {t("createAccount")}
        </SubmitButton>
      </form>

      <p className="text-center text-[14px] text-muted pb-4">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
          {t("signInLink")}
        </Link>
      </p>
    </div>
  );
}
