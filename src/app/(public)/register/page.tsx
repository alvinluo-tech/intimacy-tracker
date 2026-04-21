import Link from "next/link";

import { signUpAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-[24px] font-semibold tracking-[-0.288px] text-[var(--app-text)]">
          注册
        </div>
        <div className="text-[14px] leading-6 text-[var(--app-text-muted)]">
          创建账号后会自动生成你的 profile。
        </div>
      </div>

      {error ? <Notice>{error}</Notice> : null}

      <Card className="p-5">
        <form action={signUpAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="text-gray-900 font-medium"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              className="text-gray-900 font-medium"
              required
            />
          </div>
          <Button type="submit" variant="primary" className="w-full">
            创建账号
          </Button>
        </form>
      </Card>

      <div className="text-[13px] leading-5 text-[var(--app-text-muted)]">
        已有账号？{" "}
        <Link
          href="/login"
          className="text-[var(--brand-accent)] hover:text-[var(--brand-hover)]"
        >
          去登录
        </Link>
      </div>
    </div>
  );
}
