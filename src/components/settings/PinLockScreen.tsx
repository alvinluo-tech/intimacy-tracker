"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { verifyPinAction } from "@/features/privacy/actions";
import { useLockStore } from "@/stores/lock-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PinLockScreen({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const unlock = useLockStore((s) => s.unlock);
  const [pin, setPin] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <div className="text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">PIN 解锁</div>
      <div className="mt-2 text-[13px] leading-5 text-[var(--app-text-muted)]">
        请输入 4~6 位 PIN 继续访问应用。
      </div>
      <div className="mt-4 space-y-2">
        <Label>PIN</Label>
        <Input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="输入 PIN"
        />
      </div>
      <div className="mt-4 flex gap-3">
        <Button
          variant="primary"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await verifyPinAction(pin);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              unlock();
              toast.success("解锁成功");
              router.replace(nextPath || "/dashboard");
            });
          }}
        >
          解锁
        </Button>
      </div>
    </Card>
  );
}
