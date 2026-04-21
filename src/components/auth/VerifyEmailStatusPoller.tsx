"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

type AuthStatus = {
  authenticated: boolean;
  emailConfirmed: boolean;
};

const POLL_INTERVAL_MS = 3000;

export function VerifyEmailStatusPoller() {
  const [status, setStatus] = useState<AuthStatus>({
    authenticated: false,
    emailConfirmed: false,
  });
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      try {
        const res = await fetch("/api/auth/status", {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("status request failed");
        }
        const data = (await res.json()) as AuthStatus;
        if (!cancelled) {
          setStatus(data);
          setNetworkError(null);
        }
      } catch {
        if (!cancelled) {
          setNetworkError("状态检查失败，请稍后重试。");
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    }

    void checkStatus();
    const timer = window.setInterval(() => {
      void checkStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const ready = useMemo(() => status.authenticated && status.emailConfirmed, [status]);

  return (
    <div className="space-y-3">
      {networkError ? <Notice>{networkError}</Notice> : null}
      {isChecking ? (
        <Notice>正在自动检测验证状态...</Notice>
      ) : ready ? (
        <Notice>邮箱已验证成功，你现在可以一键返回应用。</Notice>
      ) : (
        <Notice>仍在等待邮箱验证完成，系统每 3 秒自动检测一次。</Notice>
      )}
      {ready ? (
        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
        >
          一键返回应用
        </Button>
      ) : (
        <Button type="button" variant="primary" className="w-full" disabled>
          等待验证完成
        </Button>
      )}
    </div>
  );
}
