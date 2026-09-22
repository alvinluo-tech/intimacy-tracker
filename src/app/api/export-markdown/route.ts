import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { collectFullExport } from "@/lib/export/collector";
import { transformToMarkdown } from "@/lib/export/markdown";

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

  const result = await collectFullExport();
  if (!result.ok) {
    console.error("[export-markdown] collection failed:", result.error);
    return NextResponse.json(
      { error: "Export failed while reading data" },
      { status: 500 }
    );
  }
  const data = result.data;

  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `intimacy-tracker-export-${datePart}.md`;

  // Audit log — best effort, never break the export over it
  try {
    const { error: auditError } = await supabase.from("audit_events").insert({
      user_id: user.id,
      event_type: "export_markdown",
      metadata: { filename, rows: data.rows },
    });
    if (auditError) {
      console.error("[export-markdown] audit_events insert failed:", auditError);
    }
  } catch (auditFailure) {
    console.error("[export-markdown] audit_events insert threw:", auditFailure);
  }

  const body = transformToMarkdown(data);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Export-Rows": String(data.rows),
      "X-Export-Truncated": String(data.truncated),
      "Cache-Control": "no-store",
    },
  });
}
