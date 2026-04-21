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

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-[24px] font-semibold tracking-[-0.288px] text-[var(--app-text)]">
          Check your email
        </div>
        <div className="text-[14px] leading-6 text-[var(--app-text-muted)]">
          {email
            ? `验证邮件已发送至 ${email}，请先完成邮箱验证后再继续。`
            : "我们已发送验证邮件，请先完成邮箱验证后再继续。"}
        </div>
      </div>

      {error ? <Notice>{error}</Notice> : null}
      {sent ? <Notice>验证邮件已重新发送，请检查收件箱。</Notice> : null}

      <Card className="space-y-4 p-5">
        <div className="space-y-2">
          <div className="text-[16px] font-semibold text-[var(--app-text)]">Didn&apos;t get an email?</div>
          <div className="text-[13px] leading-5 text-[var(--app-text-secondary)]">
            你可以重新发送验证邮件，或先修改邮箱后再发送。
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
        <div className="space-y-2 border-t border-[var(--app-border-subtle)] pt-4">
          <div className="text-[16px] font-semibold text-[var(--app-text)]">Entered the wrong email?</div>
          <div className="text-[13px] leading-5 text-[var(--app-text-muted)]">
            <Link
              href="/register"
              className="text-[var(--brand-accent)] hover:text-[var(--brand-hover)]"
            >
              重新输入邮箱
            </Link>
          </div>
        </div>
        <VerifyEmailStatusPoller />
        <div className="text-[13px] leading-5 text-[var(--app-text-muted)]">
          <Link
            href="/login"
            className="text-[var(--brand-accent)] hover:text-[var(--brand-hover)]"
          >
            返回登录
          </Link>
        </div>
      </Card>
    </div>
  );
}
