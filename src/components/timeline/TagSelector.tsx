"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import type { Tag } from "@/features/records/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TagSelector({
  available,
  value,
  onChange,
  newNames,
  onNewNamesChange,
}: {
  available: Tag[];
  value: string[];
  onChange: (next: string[]) => void;
  newNames: string[];
  onNewNamesChange: (next: string[]) => void;
}) {
  const t = useTranslations("encounter");
  const tc = useTranslations("common");
  const [draft, setDraft] = React.useState("");

  const selected = new Set(value);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {available.map((t) => {
          const active = selected.has(t.id);
          return (
            <Button
              key={t.id}
              type="button"
              variant={active ? "primary" : "outline"}
              size="sm"
              className="h-8 rounded-full px-3 text-[12px]"
              onClick={() => {
                const next = active
                  ? value.filter((x) => x !== t.id)
                  : [...value, t.id];
                onChange(next);
              }}
            >
              {t.name}
            </Button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={t("addTags")}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const name = draft.trim();
            if (!name) return;
            onNewNamesChange(Array.from(new Set([...newNames, name])));
            setDraft("");
          }}
        />
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            const name = draft.trim();
            if (!name) return;
            onNewNamesChange(Array.from(new Set([...newNames, name])));
            setDraft("");
          }}
        >
          {t("addTags")}
        </Button>
      </div>

      {newNames.length ? (
        <div className="flex flex-wrap gap-2">
          {newNames.map((n) => (
            <Badge
              key={n}
              className="border-[var(--app-border-subtle)] text-[var(--brand-accent)]"
            >
              {n}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

