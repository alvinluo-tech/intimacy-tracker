import Link from "next/link";

import { signInAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";

export default async function LoginPage({
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
          登录
        </div>
        <div className="text-[14px] leading-6 text-[var(--app-text-muted)]">
          仅你可访问你的数据。所有表启用 RLS。
        </div>
      </div>

      {error ? <Notice>{error}</Notice> : null}

      <Card className="p-5">
        <form action={signInAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" variant="primary" className="w-full">
            进入应用
          </Button>
        </form>
      </Card>

      <div className="text-[13px] leading-5 text-[var(--app-text-muted)]">
        还没有账号？{" "}
        <Link
          href="/register"
          className="text-[var(--brand-accent)] hover:text-[var(--brand-hover)]"
        >
          去注册
        </Link>
      </div>
    </div>
  );
}

