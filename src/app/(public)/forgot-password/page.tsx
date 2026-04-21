import Link from "next/link";

import { requestPasswordResetAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-[24px] font-semibold tracking-[-0.288px] text-[var(--app-text)]">
          找回密码
        </div>
        <div className="text-[14px] leading-6 text-[var(--app-text-muted)]">
          输入注册邮箱，我们会发送重置链接。
        </div>
      </div>

      {error ? <Notice>{error}</Notice> : null}
      {sent ? (
        <Notice>
          如果该邮箱已注册，重置邮件已发送。请检查收件箱和垃圾邮件文件夹。
        </Notice>
      ) : null}

      <Card className="p-5">
        <form action={requestPasswordResetAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={email}
              className="text-gray-900 font-medium"
              required
            />
          </div>
          <Button type="submit" variant="primary" className="w-full">
            发送重置邮件
          </Button>
        </form>
      </Card>

      <div className="text-[13px] leading-5 text-[var(--app-text-muted)]">
        <Link
          href="/login"
          className="text-[var(--brand-accent)] hover:text-[var(--brand-hover)]"
        >
          返回登录
        </Link>
      </div>
    </div>
  );
}
