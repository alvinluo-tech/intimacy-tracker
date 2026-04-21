"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";

import { resendVerificationClientAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

import { Input } from "@/components/ui/input";

const COOLDOWN_SECONDS = 60;

function getEmailProviderUrl(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  if (domain === "gmail.com") return "https://mail.google.com";
  if (domain === "outlook.com" || domain === "hotmail.com") return "https://outlook.live.com";
  if (domain === "yahoo.com") return "https://mail.yahoo.com";
  if (domain === "qq.com") return "https://mail.qq.com";
  if (domain === "163.com") return "https://mail.163.com";
  if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com") return "https://www.icloud.com/mail";

  return null;
}

export function VerifyEmailClient({
  initialEmail,
  initialError,
  initialSent,
}: {
  initialEmail: string;
  initialError?: string;
  initialSent?: boolean;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [cooldown, setCooldown] = useState(initialSent ? COOLDOWN_SECONDS : 0);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | undefined>(initialError);
  const [success, setSuccess] = useState<string | undefined>(
    initialSent ? "验证邮件已发送，请检查收件箱" : undefined
  );

  const providerUrl = getEmailProviderUrl(email);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((c) => c - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown > 0 || isPending || !email) return;

    setIsPending(true);
    setError(undefined);
    setSuccess(undefined);

    try {
      const result = await resendVerificationClientAction(email);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("验证邮件已重新发送，请检查收件箱");
        setCooldown(COOLDOWN_SECONDS);
      }
    } catch {
      setError("发送失败，请稍后重试");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <Notice>{error}</Notice> : null}
      {success ? <Notice>{success}</Notice> : null}

      <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
          <Mail className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <div className="text-[24px] font-semibold tracking-[-0.288px] text-[var(--app-text)]">
            检查你的邮箱
          </div>
          <div className="text-[14px] leading-6 text-[var(--app-text-muted)]">
            我们已向{" "}
            <span className="font-semibold text-[var(--app-text)]">
              {email || "你的邮箱"}
            </span>{" "}
            发送了一封验证邮件。
            <br />
            请点击邮件中的链接完成注册。
          </div>
        </div>

        {providerUrl && (
          <Button
            type="button"
            variant="primary"
            className="mt-2"
            onClick={() => window.open(providerUrl, "_blank", "noopener,noreferrer")}
          >
            打开邮箱应用 <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <form onSubmit={handleResend} className="space-y-4 border-t border-[var(--app-border-subtle)] pt-6">
        <div className="space-y-2">
          <label htmlFor="email" className="text-[13px] font-medium text-[var(--app-text)]">
            没有收到邮件？或者邮箱填错了？
          </label>
          <div className="flex space-x-2">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button
              type="submit"
              variant="outline"
              disabled={isPending || cooldown > 0 || !email}
              className="shrink-0"
            >
              {isPending
                ? "发送中..."
                : cooldown > 0
                ? `重新发送 (${cooldown}s)`
                : "重新发送"}
            </Button>
          </div>
        </div>
      </form>

      <div className="flex items-center justify-between pt-2 text-[13px] leading-5 text-[var(--app-text-muted)]">
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
