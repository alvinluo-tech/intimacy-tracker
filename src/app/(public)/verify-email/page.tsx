import Link from "next/link";

import { resendVerificationAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
          验证你的邮箱
        </div>
        <div className="text-[14px] leading-6 text-[var(--app-text-muted)]">
          我们已发送验证邮件，请先完成验证后再登录。
        </div>
      </div>

      {error ? <Notice>{error}</Notice> : null}
      {sent ? <Notice>验证邮件已重新发送，请检查收件箱。</Notice> : null}

      <Card className="space-y-4 p-5">
        <div className="text-[13px] leading-5 text-[var(--app-text-secondary)]">
          {email ? `当前邮箱：${email}` : "未检测到邮箱参数，请返回登录页后重试。"}
        </div>
        <form action={resendVerificationAction} className="space-y-3">
          <input type="hidden" name="email" value={email} />
          <Button type="submit" variant="primary" className="w-full" disabled={!email}>
            重新发送验证邮件
          </Button>
        </form>
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
