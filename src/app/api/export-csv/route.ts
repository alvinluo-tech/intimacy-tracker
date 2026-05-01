import { NextResponse } from "next/server";
import { stringify } from "csv-stringify/sync";

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

const BATCH_SIZE = 500;
const MAX_ROWS = 10000;
const COLUMNS = [
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
];

function transformRow(row: ExportRow) {
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
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `intimacy-tracker-export-${datePart}.csv`;

  const encoder = new TextEncoder();
  let rowCount = 0;
  let hasMore = true;
  let cursor: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      try {
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
            query = query.lt("started_at", cursor);
          }

          const { data, error } = await query;
          if (error) throw error;

          const rows = (data ?? []) as unknown as ExportRow[];
          if (rows.length === 0) break;

          const transformed = rows.map(transformRow);
          const isHeader = rowCount === 0;
          const csvChunk = stringify(transformed, {
            header: isHeader,
            columns: COLUMNS,
          });

          controller.enqueue(encoder.encode(csvChunk));
          rowCount += rows.length;

          if (rows.length < BATCH_SIZE) {
            hasMore = false;
          } else {
            cursor = rows[rows.length - 1].started_at;
          }
        }

        // Audit log
        await supabase.from("audit_events").insert({
          user_id: user.id,
          event_type: "export_csv",
          metadata: { filename, rows: rowCount },
        });

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Export-Rows": String(rowCount),
    },
  });
}
