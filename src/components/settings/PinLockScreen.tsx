"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { signOutAction } from "@/features/auth/actions";
import { verifyPinAction, requestPinResetCodeAction, verifyPinResetCodeAction } from "@/features/privacy/actions";
import { useLockStore } from "@/stores/lock-store";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const masked = local.length <= 2 ? local[0] + "***" : local[0] + "***" + local[local.length - 1];
  return masked + "@" + domain;
}

export function PinLockScreen({
  nextPath,
  pinLength,
  userEmail,
}: {
  nextPath: string;
  pinLength: number | null;
  userEmail: string;
}) {
  const t = useTranslations("pin");
  const tc = useTranslations("common");
  const router = useRouter();
  const unlock = useLockStore((s) => s.unlock);
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [pending, startTransition] = useTransition();
  const requiredLen = pinLength ?? 6;
  const maxLen = requiredLen;
  const minLen = requiredLen;
  const dots = useMemo(() => Array.from({ length: maxLen }), [maxLen]);

  const otpRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));
  const [showReset, setShowReset] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const haptic = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const submitPin = useCallback(
    (value: string) => {
      if (pending) return;
      if (value.length < minLen || value.length > maxLen) return;
      startTransition(async () => {
        const res = await verifyPinAction(value);
        if (!res.ok) {
          haptic([16, 50, 16]);
          setShake(true);
          setPin("");
          toast.error(res.error);
          window.setTimeout(() => setShake(false), 320);
          return;
        }
        haptic(30);
        unlock();
        toast.success(tc("success"));
        router.replace(nextPath || "/dashboard");
      });
    },
    [maxLen, minLen, nextPath, pending, router, unlock]
  );

  useEffect(() => {
    if (showReset) return;
    if (pin.length === maxLen) {
      submitPin(pin);
      return;
    }
    if (pin.length < minLen) return;
    const timer = window.setTimeout(() => submitPin(pin), 380);
    return () => window.clearTimeout(timer);
  }, [maxLen, minLen, pin, submitPin, showReset]);

  const appendDigit = (digit: string) => {
    if (pending) return;
    if (pin.length >= maxLen) return;
    haptic(8);
    setPin((prev) => `${prev}${digit}`);
  };

  const removeLast = () => {
    if (pending) return;
    haptic(8);
    setPin((prev) => prev.slice(0, -1));
  };

  const clearAll = () => {
    if (pending) return;
    setPin("");
  };

  const handleSendCode = () => {
    if (pending || cooldown > 0) return;
    startTransition(async () => {
      const res = await requestPinResetCodeAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setCodeSent(true);
      setCooldown(60);
      toast.success(t("codeSent"));
    });
  };

  const handleVerifyCode = () => {
    if (pending || resetCode.length !== 6) return;
    startTransition(async () => {
      const res = await verifyPinResetCodeAction(resetCode);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("pinReset"));
      router.replace(nextPath || "/dashboard");
    });
  };

  if (showReset) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center px-4 py-8">
        <div className="text-center text-[15px] font-medium tracking-[-0.13px] text-content">
          {t("resetPin")}
        </div>
        <div className="mt-2 text-center text-[12px] text-muted">
          {t("codeSent")}
        </div>

        <div className="mt-6 w-full rounded-xl border border-border bg-surface/2 px-4 py-3 text-center">
          <p className="text-[13px] text-muted">{t("verifyIdentity")}</p>
          <p className="mt-1 text-[15px] text-content">{maskEmail(userEmail)}</p>
        </div>

        <button
          type="button"
          className="mt-6 h-12 w-full rounded-full bg-rose-500 text-[15px] font-medium text-white transition-all hover:bg-rose-400 disabled:opacity-40"
          disabled={pending || cooldown > 0}
          onClick={handleSendCode}
        >
          {codeSent ? `${tc("submit")}${cooldown > 0 ? ` (${cooldown}s)` : ""}` : t("codeSent")}
        </button>

        {codeSent && (
          <div className="mt-6 w-full space-y-4">
            <div className="text-center text-[12px] text-muted">{t("enterCode")}</div>
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => { (otpRefs.current as (HTMLInputElement | null)[])[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={resetCode[i] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (!val) return;
                    const digits = resetCode.split("");
                    digits[i] = val[val.length - 1];
                    setResetCode(digits.join(""));
                    if (i < 5) (otpRefs.current as (HTMLInputElement | null)[])[i + 1]?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !resetCode[i] && i > 0) {
                      (otpRefs.current as (HTMLInputElement | null)[])[i - 1]?.focus();
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  className="h-14 w-12 rounded-xl border border-border bg-surface/4 text-center text-[24px] text-content outline-none transition-colors focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30"
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <button
              type="button"
              className="h-12 w-full rounded-full bg-rose-500 text-[15px] font-medium text-white transition-all hover:bg-rose-400 disabled:opacity-40"
              disabled={pending || resetCode.length !== 6}
              onClick={handleVerifyCode}
            >
              {t("resetPin")}
            </button>
          </div>
        )}

        <button
          type="button"
          className="mt-6 text-[11px] tracking-[0.02em] text-muted transition-colors hover:text-content"
          onClick={() => { setShowReset(false); setResetCode(""); setCodeSent(false); }}
        >
          {t("enterPin")}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center px-4 py-8">
      <div className="text-center text-[15px] font-medium tracking-[-0.13px] text-content">
        {t("enterPin")}
      </div>
      <div className="mt-2 text-center text-[12px] text-muted">
        {t("unlock")}
      </div>

      <div className={`mt-8 flex items-center justify-center gap-3 ${shake ? "pin-shake" : ""}`}>
        {dots.map((_, index) => (
          <span
            key={index}
            className={[
              "h-2 w-2 rounded-full border border-border transition-all",
              index < pin.length
                ? "bg-content border-content pin-dot-glow"
                : "bg-transparent",
            ].join(" ")}
          />
        ))}
      </div>

      <div className="mt-10 grid w-full grid-cols-3 gap-x-5 gap-y-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", tc("clear"), "0", tc("delete")].map((key) => {
          const isAction = key === tc("clear") || key === tc("delete");
          return (
            <button
              key={key}
              type="button"
              className={[
                "h-14 w-full rounded-full text-center transition-all focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-rose-400/40",
                isAction
                  ? "text-[12px] text-muted hover:text-content active:bg-surface/4"
                  : "text-[30px] font-light text-content active:bg-rose-500/20",
              ].join(" ")}
              disabled={pending}
              onClick={() => {
                if (key === tc("delete")) return removeLast();
                if (key === tc("clear")) return clearAll();
                appendDigit(key);
              }}
            >
              {key}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center">
        <button
          type="button"
          className="text-[11px] tracking-[0.02em] text-muted transition-colors hover:text-content"
          onClick={() => setShowReset(true)}
        >
          {t("forgotPin")}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center">
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-[11px] tracking-[0.02em] text-muted transition-colors hover:text-content"
          >
            {tc("submit")}
          </button>
        </form>
      </div>
    </div>
  );
}