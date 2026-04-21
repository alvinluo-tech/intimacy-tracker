import Link from "next/link";

import { resendVerificationAction } from "@/features/auth/actions";
import { VerifyEmailStatusPoller } from "@/components/auth/VerifyEmailStatusPoller";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  return (
    <div className="space-y-4">
      {error ? <Notice>{error}</Notice> : null}
      {fromLoginUnverified ? <Notice>邮箱未验证，请先完成验证后再登录。</Notice> : null}
      {fromRegister && unverified ? (
        <Notice>该邮箱已注册但尚未验证，可在下方重新发送验证邮件。</Notice>
      ) : null}
      {sent ? <Notice>验证邮件已重新发送，请检查收件箱。</Notice> : null}

      <Card className="space-y-5 p-5">
        <div className="space-y-2">
          <div className="text-[24px] font-semibold tracking-[-0.288px] text-[var(--app-text)]">
            验证你的邮箱
          </div>
          <div className="text-[14px] leading-6 text-[var(--app-text-muted)]">
            {email
              ? <>验证邮件已发送至 <span className="font-semibold text-[var(--app-text)]">{email}</span>，完成验证后即可继续使用。</>
              : "请先完成邮箱验证后再继续使用。"}
          </div>
        </div>

        <form action={resendVerificationAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={email}
              autoComplete="email"
              className="text-gray-900 font-medium"
              required
            />
          </div>
          <Button type="submit" variant="primary" className="w-full">
            重新发送验证邮件
          </Button>
        </form>

        <div className="text-[13px] leading-5 text-[var(--app-text-muted)]">
          邮箱填错了？直接修改上方输入框并重新发送即可。
        </div>

        <div className="border-t border-[var(--app-border-subtle)] pt-4">
          <VerifyEmailStatusPoller />
        </div>

        <div className="flex items-center justify-between text-[13px] leading-5 text-[var(--app-text-muted)]">
          <Link href="/login" className="text-[var(--brand-accent)] hover:text-[var(--brand-hover)]">
            返回登录
          </Link>
          <Link
            href="/register"
            className="text-[var(--brand-accent)] hover:text-[var(--brand-hover)]"
          >
            去注册新邮箱
          </Link>
        </div>
      </Card>
    </div>
  );
}
