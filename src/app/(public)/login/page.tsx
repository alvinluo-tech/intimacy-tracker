import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { signInAction } from "@/features/auth/actions";
import { AuthField } from "@/components/auth/AuthField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Notice } from "@/components/ui/notice";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const message = typeof sp.message === "string" ? sp.message : undefined;
  const t = await getTranslations("auth");

  return (
    <div className="space-y-7">
      <div className="space-y-3 pt-5 text-center sm:pt-0">
        <h1 className="text-[40px] font-semibold tracking-[-0.03em] text-content sm:text-[56px]">
          {t("welcomeBack")}
        </h1>
        <p className="text-[20px] text-muted">{t("signInSubtitle")}</p>
      </div>

      {error ? (
        <Notice className="border-destructive/45 bg-destructive/45 text-destructive-foreground">{error}</Notice>
      ) : null}
      {message ? (
        <Notice className="border-success/55 bg-success/55 text-success-foreground">{message}</Notice>
      ) : null}

      <form action={signInAction} className="space-y-5">
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
          label={t("passwordLabel")}
          iconName="key"
          type="password"
          autoComplete="current-password"
          placeholder={t("passwordPlaceholder")}
          required
          rightLabel={
            <Link
              href="/forgot-password"
              className="text-[14px] font-medium text-primary transition hover:text-primary/80"
            >
              {t("forgotPassword")}
            </Link>
          }
        />
        <SubmitButton className="h-14 w-full rounded-[18px] border-0 bg-primary text-[18px] font-semibold tracking-normal text-white shadow-[0_10px_26px_rgba(var(--primary-rgb),0.35)] hover:bg-primary/90">
          {t("signIn")}
        </SubmitButton>
      </form>

      <div className="flex items-center gap-4 py-1 text-muted">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[14px] font-medium uppercase tracking-[0.18em]">{t("or")}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        className="h-14 w-full rounded-[18px] border border-border bg-surface/78 text-[18px] font-medium text-content transition hover:bg-surface"
      >
        {t("continueWithGoogle")}
      </button>

      <p className="pb-2 text-center text-[18px] text-muted">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-primary transition hover:text-primary/80">
          {t("signUpLink")}
        </Link>
      </p>
    </div>
  );
}
