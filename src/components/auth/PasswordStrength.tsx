"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";

type CheckItem = { label: string; pass: boolean };

function getChecks(password: string, t: (k: string) => string): CheckItem[] {
  return [
    { label: t("strengthRuleLength"), pass: password.length >= 8 },
    { label: t("strengthRuleUpper"), pass: /[A-Z]/.test(password) },
    { label: t("strengthRuleLower"), pass: /[a-z]/.test(password) },
    { label: t("strengthRuleNumber"), pass: /[0-9]/.test(password) },
    { label: t("strengthRuleSymbol"), pass: /[^A-Za-z0-9]/.test(password) },
  ];
}

function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "weak", color: "#ef4444" };
  if (score <= 2) return { score: 2, label: "weak", color: "#f97316" };
  if (score <= 3) return { score: 3, label: "fair", color: "#f59e0b" };
  if (score <= 4) return { score: 4, label: "good", color: "#84cc16" };
  return { score: 5, label: "strong", color: "#10b981" };
}

export function PasswordStrength() {
  const t = useTranslations("auth");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.querySelector<HTMLInputElement>('input[name="password"]');
    if (!el) return;
    const handler = () => {
      setPassword(el.value);
      setVisible(el.value.length > 0);
    };
    el.addEventListener("input", handler);
    return () => el.removeEventListener("input", handler);
  }, []);

  const checks = useMemo(() => getChecks(password, t), [password, t]);
  const { score, label, color } = getStrength(password);
  const passed = checks.filter((c) => c.pass).length;

  return (
    <div
      className={`space-y-3 transition-all duration-300 ${
        visible ? "opacity-100 max-h-64" : "opacity-0 max-h-0 overflow-hidden"
      }`}
      aria-hidden={!visible}
    >
      {/* Strength bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className="h-1.5 flex-1 rounded-full transition-colors duration-300"
            style={{ backgroundColor: s <= score ? color : "var(--border)" }}
          />
        ))}
      </div>
      <p className="text-[11px] font-medium" style={{ color }}>
        {t(`strength${label.charAt(0).toUpperCase() + label.slice(1)}`)} · {passed}/5
      </p>

      {/* Requirement checklist */}
      <ul className="space-y-1">
        {checks.map((check) => (
          <li
            key={check.label}
            className="flex items-center gap-2 text-[11px]"
            style={{ color: check.pass ? "#10b981" : "var(--muted)" }}
          >
            {check.pass ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
