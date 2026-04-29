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
    <div className="space-y-7">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-[16px] text-[#7f9cc4] transition hover:text-[#a7c0df]"
      >
        <ArrowLeft className="h-5 w-5" /> {t("backToLogin")}
      </Link>

      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[22px] border border-[#1c355e] bg-[#0f1d3d]/85 text-[#ff4f81]">
          <Mail className="h-9 w-9" />
        </div>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold tracking-[-0.03em] text-[#dce9ff] sm:text-[56px]">
            {t("forgotPassword")}
          </h1>
          <p className="text-[20px] text-[#6785b1]">{t("forgotPasswordSubtitle")}</p>
        </div>
      </div>

      {error ? (
        <Notice className="border-[#ff3e73]/45 bg-[#431634]/45 text-[#ffd2df]">{error}</Notice>
      ) : null}
      {sent ? (
        <Notice className="border-[#2f876d]/55 bg-[#0f3b33]/55 text-[#9eeecf]">
          {t("resetEmailSent")}
        </Notice>
      ) : null}

      <form action={requestPasswordResetAction} className="space-y-5">
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
        <SubmitButton className="h-14 w-full rounded-[18px] border-0 bg-[#ff3e73] text-[18px] font-semibold tracking-normal text-white shadow-[0_10px_26px_rgba(255,62,115,0.35)] hover:bg-[#ff5a88]">
          {t("sendResetInstructions")}
        </SubmitButton>
      </form>

      <p className="pb-2 text-center text-[18px] text-[#6684af]">
        {t("rememberPassword")}{" "}
        <Link href="/login" className="font-semibold text-[#ff4f81] transition hover:text-[#ff6b95]">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
