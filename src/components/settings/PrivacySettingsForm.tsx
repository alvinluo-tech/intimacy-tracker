"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { savePrivacySettingsAction } from "@/features/privacy/actions";
import type { PrivacySettings } from "@/features/privacy/queries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrivacyModeSwitch } from "@/components/settings/PrivacyModeSwitch";

export function PrivacySettingsForm({ initial }: { initial: PrivacySettings }) {
  const [timezone, setTimezone] = useState(initial.timezone);
  const [locationMode, setLocationMode] = useState(initial.locationMode);
  const [requirePin, setRequirePin] = useState(initial.requirePin);
  const [newPin, setNewPin] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Card className="p-5">
      <div className="text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)]">隐私设置</div>
      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label>时区</Label>
          <Input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="例如：Europe/Paris"
          />
        </div>

        <PrivacyModeSwitch value={locationMode} onChange={setLocationMode} />

        <div className="space-y-2">
          <Label>PIN 保护</Label>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={requirePin}
              onChange={(e) => setRequirePin(e.target.checked)}
            />
            <span className="text-[13px] text-[var(--app-text-secondary)]">进入应用需要 PIN</span>
          </label>
          {!initial.hasPin ? (
            <div className="text-[12px] text-[var(--app-text-muted)]">
              你还未设置 PIN，开启前请先填写下方新 PIN。
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>新 PIN（4~6 位数字，可选）</Label>
          <Input
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder={initial.hasPin ? "留空表示不修改" : "请输入 4~6 位数字"}
            inputMode="numeric"
            maxLength={6}
          />
        </div>

        <Button
          type="button"
          variant="primary"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await savePrivacySettingsAction({
                timezone,
                locationMode,
                requirePin,
                newPin,
              });
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              setNewPin("");
              toast.success("隐私设置已保存");
            });
          }}
        >
          保存设置
        </Button>
      </div>
    </Card>
  );
}
