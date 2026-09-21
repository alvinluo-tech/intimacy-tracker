import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
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

const BATCH_SIZE = 500;
const MAX_ROWS = 10000;

function transformRow(row: ExportRow) {
  const partner = normalizeRelOne(row.partner);
  const tags = (row.encounter_tags ?? [])
    .map((et) => normalizeRelOne(et.tag))
    .filter((t): t is Tag => Boolean(t))
    .map((t) => t.name);

  return {
    record_id: row.id,
    started_at: row.started_at,
    ended_at: row.ended_at ?? null,
    duration_minutes: row.duration_minutes ?? null,
    partner_nickname: partner?.nickname ?? null,
    city: row.city ?? null,
    country: row.country ?? null,
    rating: row.rating ?? null,
    mood: row.mood ?? null,
    tags,
    created_at: row.created_at ?? null,
  };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit: 3 exports per minute per user (shared key across export types)
  const rl = await rateLimit(`export:${user.id}`, { windowMs: 60_000, max: 3 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `intimacy-tracker-export-${datePart}.json`;

  let rowCount = 0;
  let hasMore = true;
  let cursor: string | null = null;
  const collected: ReturnType<typeof transformRow>[] = [];

  while (hasMore && rowCount < MAX_ROWS) {
    let query = supabase
      .from("encounters")
      .select(
        "id,started_at,ended_at,duration_minutes,city,country,rating,mood,created_at,partner:partners(nickname),encounter_tags(tag:tags(id,name,color))"
      )
      .order("started_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(BATCH_SIZE);

    if (cursor) {
      const parts = cursor.split("::");
      const cursorDate = parts[0];
      const cursorId = parts[1] || "0";
      query = query.or(
        `started_at.lt.${cursorDate},and(started_at.eq.${cursorDate},id.lt.${cursorId})`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("[export-json] query failed:", error);
      return NextResponse.json(
        { error: "Export failed while reading data" },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as unknown as ExportRow[];
    if (rows.length === 0) break;

    for (const row of rows) {
      collected.push(transformRow(row));
    }
    rowCount += rows.length;

    if (rows.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      const last = rows[rows.length - 1];
      cursor = `${last.started_at}::${last.id}`;
    }
  }

  // Audit log — best effort, never break the export over it
  try {
    const { error: auditError } = await supabase.from("audit_events").insert({
      user_id: user.id,
      event_type: "export_json",
      metadata: { filename, rows: rowCount },
    });
    if (auditError) {
      console.error("[export-json] audit_events insert failed:", auditError);
    }
  } catch (auditFailure) {
    console.error("[export-json] audit_events insert threw:", auditFailure);
  }

  const body = {
    exported_at: new Date().toISOString(),
    rows: rowCount,
    truncated: rowCount >= MAX_ROWS,
    data: collected,
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Export-Rows": String(rowCount),
      "Cache-Control": "no-store",
    },
  });
}
