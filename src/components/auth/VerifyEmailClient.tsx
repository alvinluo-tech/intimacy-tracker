"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { resendVerificationClientAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
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
  const t = useTranslations("auth");
  const [email, setEmail] = useState(initialEmail);
  const [cooldown, setCooldown] = useState(initialSent ? COOLDOWN_SECONDS : 0);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | undefined>(initialError);
  const [success, setSuccess] = useState<string | undefined>(
    initialSent ? t("verificationEmailSent", { email: initialEmail }) : undefined
  );

  const providerUrl = getEmailProviderUrl(email);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
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
      if (result.error) setError(result.error);
      else {
        setSuccess(t("verificationEmailSent", { email }));
        setCooldown(COOLDOWN_SECONDS);
      }
    } catch {
      setError("Failed to send. Please try again later.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-[13px] text-emerald-600 dark:text-emerald-400">
          {success}
        </div>
      )}

      <p className="text-[14px] text-muted leading-relaxed text-center">
        {email ? t("verificationEmailSent", { email }) : t("verifyEmailNotice")}
      </p>

      {providerUrl && (
        <button
          type="button"
          onClick={() => window.open(providerUrl, "_blank", "noopener,noreferrer")}
          className="w-full h-11 rounded-lg border border-border bg-surface hover:bg-surface/70 text-[14px] font-medium text-content flex items-center justify-center gap-2 transition-colors"
        >
          Open your inbox <ArrowRight className="w-4 h-4" />
        </button>
      )}

      <div className="border-t border-border pt-5">
        <p className="text-[12px] text-muted mb-3">
          Didn&apos;t receive it? Wrong email? Change and resend.
        </p>
        <form onSubmit={handleResend} className="flex gap-2">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={isPending || cooldown > 0 || !email}
            className="shrink-0"
          >
            {isPending ? t("resendEmail") : cooldown > 0 ? `${cooldown}s` : t("resendEmail")}
          </Button>
        </form>
      </div>

      <div className="text-center pt-1">
        <Link
          href="/login"
          className="text-[13px] text-brand-accent hover:text-brand-hover transition-colors"
        >
          {t("backToLogin")}
        </Link>
      </div>
    </div>
  );
}
