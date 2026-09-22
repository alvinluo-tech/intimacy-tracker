import { describe, it, expect } from "vitest";

import { transformToMarkdown } from "@/lib/export/markdown";
import type { FullExport } from "@/lib/export/collector";

function makeExport(overrides?: Partial<FullExport>): FullExport {
  return {
    schema_version: 1,
    app: "encounter",
    exported_at: "2026-09-22T12:00:00.000Z",
    rows: 2,
    truncated: false,
    profile: { timezone: "Asia/Shanghai" },
    partners: [{ id: "p1", nickname: "Alice", color: null, avatar_url: null, is_default: null, source: "local", bound_user_id: null, status: "active" }],
    tags: [{ id: "t1", name: "romantic", color: null }],
    encounters: [
      {
        id: "enc-1",
        started_at: "2026-01-05T02:00:00.000Z",
        ended_at: "2026-01-05T02:30:00.000Z",
        duration_minutes: 30,
        timezone: "Asia/Shanghai",
        rating: 4,
        mood: "Happy",
        climaxed: true,
        location_enabled: true,
        location_precision: "city",
        latitude: 31.2,
        longitude: 121.5,
        location_label: "Home",
        location_notes: null,
        city: "Shanghai",
        country: "China",
        partner_id: "p1",
        partner_nickname: "Alice",
        share_notes_with_partner: false,
        notes: "美好的一晚\n值得记住",
        notes_unavailable: false,
        tags: ["romantic"],
        photos: [{ path: "user-1/enc-1/a.jpg", is_private: false }],
      },
      {
        id: "enc-2",
        started_at: "2026-02-14T20:00:00.000Z",
        ended_at: null,
        duration_minutes: null,
        timezone: null,
        rating: null,
        mood: null,
        climaxed: null,
        location_enabled: false,
        location_precision: "off",
        latitude: null,
        longitude: null,
        location_label: null,
        location_notes: null,
        city: null,
        country: null,
        partner_id: null,
        partner_nickname: null,
        share_notes_with_partner: null,
        notes: null,
        notes_unavailable: true,
        tags: [],
        photos: [],
      },
    ],
    ...overrides,
  };
}

describe("transformToMarkdown", () => {
  it("renders a header with counts", () => {
    const md = transformToMarkdown(makeExport());
    expect(md).toContain("# Encounter export — 2026-09-22");
    expect(md).toContain("2 records, 1 partner, 1 tag");
    expect(md).not.toContain("truncated");
  });

  it("marks truncated exports", () => {
    const md = transformToMarkdown(makeExport({ truncated: true, rows: 10000 }));
    expect(md).toContain("(truncated)");
  });

  it("renders headings in the record's own timezone", () => {
    const md = transformToMarkdown(makeExport());
    // 2026-01-05T02:00Z is 10:00 in Asia/Shanghai
    expect(md).toContain("## 2026-01-05 10:00");
  });

  it("renders facts and quotes notes line by line", () => {
    const md = transformToMarkdown(makeExport());
    expect(md).toContain("- Duration: 30 min");
    expect(md).toContain("- Partner: Alice");
    expect(md).toContain("- Rating: 4/5");
    expect(md).toContain("- Climaxed: yes");
    expect(md).toContain("- Location: Home, Shanghai, China");
    expect(md).toContain("- Tags: romantic");
    expect(md).toContain("- Photos: 1");
    expect(md).toContain("> 美好的一晚");
    expect(md).toContain("> 值得记住");
  });

  it("notes decryption failures explicitly", () => {
    const md = transformToMarkdown(makeExport());
    expect(md).toContain("> [note could not be decrypted]");
  });

  it("keeps user notes from inventing headings", () => {
    const data = makeExport();
    data.encounters[0].notes = "# NOT A HEADING";
    const md = transformToMarkdown(data);
    expect(md).toContain("> # NOT A HEADING");
    expect(md).toContain("## 2026-01-05 10:00");
  });

  it("renders minimal records without empty fact blocks", () => {
    const md = transformToMarkdown(makeExport());
    const idx = md.indexOf("## 2026-02-14");
    expect(idx).toBeGreaterThan(0);
    const minimal = md.slice(idx);
    expect(minimal).not.toContain("- Duration");
    expect(minimal).not.toContain("- Partner:");
    expect(minimal).toContain("## 2026-02-14 20:00");
  });

  it("uses singular wording for one record", () => {
    const data = makeExport({ rows: 1 });
    data.encounters = data.encounters.slice(0, 1);
    const md = transformToMarkdown(data);
    expect(md).toContain("1 record, 1 partner, 1 tag");
  });
});
