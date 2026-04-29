import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { signUpAction } from "@/features/auth/actions";
import { AuthField } from "@/components/auth/AuthField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Notice } from "@/components/ui/notice";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const t = await getTranslations("auth");

  return (
    <div className="space-y-7">
      <div className="space-y-3 pt-5 text-center sm:pt-0">
        <h1 className="text-[40px] font-semibold tracking-[-0.03em] text-content sm:text-[56px]">
          {t("createAccount")}
        </h1>
        <p className="text-[20px] text-muted">{t("signUpSubtitle")}</p>
      </div>

      {error ? (
        <Notice className="border-destructive/45 bg-destructive/45 text-destructive-foreground">{error}</Notice>
      ) : null}

      <form action={signUpAction} className="space-y-5">
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
          iconName="key"
          type="password"
          autoComplete="new-password"
          placeholder={t("confirmPasswordPlaceholder")}
          minLength={8}
          required
        />

        <label className="flex items-center gap-3 text-[15px] text-muted">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="h-5 w-5 rounded-[6px] border border-border bg-surface text-primary accent-primary"
          />
          <span>
            {t("agreeTerms")} <span className="text-primary">{t("termsOfService")}</span> {t("and")}{" "}
            <span className="text-primary">{t("privacyPolicy")}</span>
          </span>
        </label>

          <SubmitButton className="h-14 w-full rounded-[18px] border-0 bg-primary text-[18px] font-semibold tracking-normal text-white shadow-[0_10px_26px_rgba(var(--primary-rgb),0.35)] hover:bg-primary/90">
          {t("createAccount")}
        </SubmitButton>
      </form>

      <p className="pb-2 text-center text-[18px] text-muted">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-primary transition hover:text-primary/80">
          {t("signInLink")}
        </Link>
      </p>
    </div>
  );
}
