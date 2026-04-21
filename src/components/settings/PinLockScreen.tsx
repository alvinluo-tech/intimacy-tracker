"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { signOutAction } from "@/features/auth/actions";
import { verifyPinAction } from "@/features/privacy/actions";
import { useLockStore } from "@/stores/lock-store";

export function PinLockScreen({
  nextPath,
  pinLength,
}: {
  nextPath: string;
  pinLength: number | null;
}) {
  const router = useRouter();
  const unlock = useLockStore((s) => s.unlock);
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [pending, startTransition] = useTransition();
  const maxLen = pinLength ?? 6;
  const minLen = pinLength ?? 4;
  const dots = useMemo(() => Array.from({ length: maxLen }), [maxLen]);

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
        toast.success("Welcome back");
        router.replace(nextPath || "/dashboard");
      });
    },
    [maxLen, minLen, nextPath, pending, router, unlock]
  );

  useEffect(() => {
    if (pin.length === maxLen) {
      submitPin(pin);
      return;
    }
    if (pin.length < minLen) return;
    const timer = window.setTimeout(() => submitPin(pin), 380);
    return () => window.clearTimeout(timer);
  }, [maxLen, minLen, pin, submitPin]);

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

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center px-4 py-8">
      <div className="text-center text-[15px] font-medium tracking-[-0.13px] text-[#f7f8f8]">
        Welcome back
      </div>
      <div className="mt-2 text-center text-[12px] text-[#8a8f98]">
        输入 {pinLength ?? "4~6"} 位 PIN 自动解锁
      </div>

      <div className={`mt-8 flex items-center justify-center gap-3 ${shake ? "pin-shake" : ""}`}>
        {dots.map((_, index) => (
          <span
            key={index}
            className={[
              "h-2 w-2 rounded-full border border-white/[0.2] transition-all",
              index < pin.length
                ? "bg-white border-white pin-dot-glow"
                : "bg-transparent",
            ].join(" ")}
          />
        ))}
      </div>

      <div className="mt-10 grid w-full grid-cols-3 gap-x-5 gap-y-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "清空", "0", "删除"].map((key) => {
          const isAction = key === "清空" || key === "删除";
          return (
            <button
              key={key}
              type="button"
              className={[
                "h-14 w-full rounded-full text-center transition-all focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-rose-400/40",
                isAction
                  ? "text-[12px] text-[#8a8f98] hover:text-[#d0d6e0] active:bg-white/[0.04]"
                  : "text-[30px] font-light text-[#f7f8f8] active:bg-rose-500/20",
              ].join(" ")}
              disabled={pending}
              onClick={() => {
                if (key === "删除") return removeLast();
                if (key === "清空") return clearAll();
                appendDigit(key);
              }}
            >
              {key}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center">
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-[11px] tracking-[0.02em] text-[#62666d] transition-colors hover:text-[#8a8f98]"
          >
            紧急登出
          </button>
        </form>
      </div>
    </div>
  );
}
