"use client";

import { Label } from "@/components/ui/label";

export function PrivacyModeSwitch({
  value,
  onChange,
}: {
  value: "off" | "city" | "exact";
  onChange: (value: "off" | "city" | "exact") => void;
}) {
  return (
    <div className="space-y-2">
      <Label>位置记录模式</Label>
      <select
        className="h-10 w-full rounded-[6px] border border-[var(--app-border)] bg-white/[0.02] px-3 text-[14px] text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(113,112,255,0.4)]"
        value={value}
        onChange={(e) => onChange(e.target.value as "off" | "city" | "exact")}
      >
        <option value="off">off（默认，最小采集）</option>
        <option value="city">city（仅城市）</option>
        <option value="exact">exact（精确位置）</option>
      </select>
    </div>
  );
}
