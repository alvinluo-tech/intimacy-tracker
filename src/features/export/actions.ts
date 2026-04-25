"use server";

import { stringify } from "csv-stringify/sync";

import { getServerUser } from "@/features/auth/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tag } from "@/features/records/types";

type ExportRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  city: string | null;
  country: string | null;
  rating: number | null;
  mood: string | null;
  created_at: string | null;
  partner: { nickname: string | null } | Array<{ nickname: string | null }> | null;
  encounter_tags: Array<{ tag: Tag | Tag[] | null }>;
};

function normalizeRelOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function exportCsvAction() {
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("encounters")
    .select(
      "id,started_at,ended_at,duration_minutes,city,country,rating,mood,created_at,partner:partners(nickname),encounter_tags(tag:tags(id,name,color))"
    )
    .order("started_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message };

  const rows = (data ?? []) as unknown as ExportRow[];
  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `intimacy-tracker-export-${datePart}.csv`;

  const csvRows = rows.map((row) => {
    const partner = normalizeRelOne(row.partner);
    const tags = (row.encounter_tags ?? [])
      .map((et) => normalizeRelOne(et.tag))
      .filter((t): t is Tag => Boolean(t))
      .map((t) => t.name)
      .join("|");

    return {
      record_id: row.id,
      started_at: row.started_at,
      ended_at: row.ended_at ?? "",
      duration_minutes: row.duration_minutes ?? "",
      partner_nickname: partner?.nickname ?? "",
      city: row.city ?? "",
      country: row.country ?? "",
      rating: row.rating ?? "",
      mood: row.mood ?? "",
      tags,
      created_at: row.created_at ?? "",
    };
  });

  const csv = stringify(csvRows, {
    header: true,
    columns: [
      "record_id",
      "started_at",
      "ended_at",
      "duration_minutes",
      "partner_nickname",
      "city",
      "country",
      "rating",
      "mood",
      "tags",
      "created_at",
    ],
  });

  const { error: auditError } = await supabase.from("audit_events").insert({
    user_id: user.id,
    event_type: "export_csv",
    metadata: {
      filename,
      rows: csvRows.length,
    },
  });
  if (auditError) return { ok: false as const, error: auditError.message };

  return {
    ok: true as const,
    filename,
    csv,
    rows: csvRows.length,
  };
}
