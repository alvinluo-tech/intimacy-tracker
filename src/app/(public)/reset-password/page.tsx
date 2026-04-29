import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { updatePasswordAction } from "@/features/auth/actions";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-[24px] font-semibold tracking-[-0.288px] text-[var(--app-text)]">
          {t("resetPassword")}
        </div>
        <div className="text-[14px] leading-6 text-[var(--app-text-muted)]">
          {t("newPasswordDescription")}
        </div>
      </div>

      {error ? <Notice>{error}</Notice> : null}

      <Card className="p-5">
        <form action={updatePasswordAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("newPassword")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <SubmitButton className="w-full mt-4">
            {t("resetPassword")}
          </SubmitButton>
        </form>
      </Card>

      <div className="text-[13px] leading-5 text-[var(--app-text-muted)]">
        <Link
          href="/login"
          className="text-[var(--brand-accent)] hover:text-[var(--brand-hover)]"
        >
          {t("backToLogin")}
        </Link>
      </div>
    </div>
  );
}
