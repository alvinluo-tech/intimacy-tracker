"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { signOutAction } from "@/features/auth/actions";
import { verifyPinAction } from "@/features/privacy/actions";
import { useLockStore } from "@/stores/lock-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PinLockScreen({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const unlock = useLockStore((s) => s.unlock);
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [pending, startTransition] = useTransition();
  const dots = useMemo(() => Array.from({ length: 6 }), []);

  const haptic = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const submitPin = useCallback(
    (value: string) => {
      if (pending) return;
      if (value.length < 4 || value.length > 6) return;
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
    [nextPath, pending, router, unlock]
  );

  useEffect(() => {
    if (pin.length === 6) {
      submitPin(pin);
      return;
    }
    if (pin.length < 4) return;
    const timer = window.setTimeout(() => submitPin(pin), 380);
    return () => window.clearTimeout(timer);
  }, [pin, submitPin]);

  const appendDigit = (digit: string) => {
    if (pending) return;
    if (pin.length >= 6) return;
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
    <Card className="mx-auto w-full max-w-md bg-white/[0.03] p-6 backdrop-blur-xl">
      <div className="text-center text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">
        Welcome back
      </div>
      <div className="mt-2 text-center text-[12px] text-[var(--app-text-muted)]">输入 PIN 自动解锁</div>

      <div className={`mt-5 flex items-center justify-center gap-3 ${shake ? "pin-shake" : ""}`}>
        {dots.map((_, index) => (
          <span
            key={index}
            className={[
              "h-3 w-3 rounded-full border border-white/[0.25] transition-all",
              index < pin.length
                ? "bg-[var(--brand-accent)] border-[var(--brand-accent)]"
                : "bg-transparent",
            ].join(" ")}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "清空", "0", "删除"].map((key) => {
          const isAction = key === "清空" || key === "删除";
          return (
            <Button
              key={key}
              type="button"
              variant={isAction ? "outline" : "ghost"}
              className="h-12 text-[15px]"
              disabled={pending}
              onClick={() => {
                if (key === "删除") return removeLast();
                if (key === "清空") return clearAll();
                appendDigit(key);
              }}
            >
              {key}
            </Button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            紧急登出
          </Button>
        </form>
      </div>
    </Card>
  );
}
