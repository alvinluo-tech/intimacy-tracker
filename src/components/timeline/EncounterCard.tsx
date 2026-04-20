"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import type { EncounterListItem } from "@/features/records/types";
import { deleteEncounterAction } from "@/features/records/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

function formatRange(startedAt: string, endedAt: string | null) {
  const s = new Date(startedAt);
  const e = endedAt ? new Date(endedAt) : null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
  const time = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
  const end = e ? `${pad(e.getHours())}:${pad(e.getMinutes())}` : "";
  return end ? `${date} ${time}–${end}` : `${date} ${time}`;
}

export function EncounterCard({ item }: { item: EncounterListItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/records/${item.id}`}
            className="block text-[14px] font-medium tracking-[-0.13px] text-[var(--app-text)] hover:text-[var(--brand-accent)]"
          >
            {formatRange(item.started_at, item.ended_at)}
          </Link>
          <div className="mt-1 text-[13px] leading-5 text-[var(--app-text-muted)]">
            {item.duration_minutes ? `${item.duration_minutes} 分钟` : "未结束"}
            {item.rating ? ` · 评分 ${item.rating}/5` : ""}
            {item.partner?.nickname ? ` · ${item.partner.nickname}` : ""}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/records/${item.id}/edit`}
            className="text-[12px] font-medium tracking-[-0.15px] text-[var(--app-text-secondary)] hover:text-[var(--app-text)]"
          >
            编辑
          </Link>
          <ConfirmDeleteDialog
            onConfirm={() => {
              startTransition(async () => {
                const res = await deleteEncounterAction(item.id);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("已删除");
                router.refresh();
              });
            }}
            pending={pending}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                className="h-8 w-8 px-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </div>

      {item.tags.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.tags.map((t) => (
            <Badge key={t.id}>{t.name}</Badge>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
