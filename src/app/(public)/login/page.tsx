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
        <h1 className="text-[40px] font-semibold tracking-[-0.03em] text-[#dce9ff] sm:text-[56px]">
          {t("welcomeBack")}
        </h1>
        <p className="text-[20px] text-[#6785b1]">{t("signInSubtitle")}</p>
      </div>

      {error ? (
        <Notice className="border-[#ff3e73]/45 bg-[#431634]/45 text-[#ffd2df]">{error}</Notice>
      ) : null}
      {message ? (
        <Notice className="border-[#2f876d]/55 bg-[#0f3b33]/55 text-[#9eeecf]">{message}</Notice>
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
              className="text-[14px] font-medium text-[#ff4f81] transition hover:text-[#ff6b95]"
            >
              {t("forgotPassword")}
            </Link>
          }
        />
        <SubmitButton className="h-14 w-full rounded-[18px] border-0 bg-[#ff3e73] text-[18px] font-semibold tracking-normal text-white shadow-[0_10px_26px_rgba(255,62,115,0.35)] hover:bg-[#ff5a88]">
          {t("signIn")}
        </SubmitButton>
      </form>

      <div className="flex items-center gap-4 py-1 text-[#56739d]">
        <div className="h-px flex-1 bg-[#17365f]" />
        <span className="text-[14px] font-medium uppercase tracking-[0.18em]">{t("or")}</span>
        <div className="h-px flex-1 bg-[#17365f]" />
      </div>

      <button
        type="button"
        className="h-14 w-full rounded-[18px] border border-[#1b3a66] bg-[#101f3e]/78 text-[18px] font-medium text-[#caddff] transition hover:bg-[#15284d]"
      >
        {t("continueWithGoogle")}
      </button>

      <p className="pb-2 text-center text-[18px] text-[#6684af]">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-[#ff4f81] transition hover:text-[#ff6b95]">
          {t("signUpLink")}
        </Link>
      </p>
    </div>
  );
}
