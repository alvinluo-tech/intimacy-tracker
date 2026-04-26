export type QuickLogLocationDraft = {
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  city: string | null;
  country: string | null;
  locationPrecision: "off" | "city" | "exact";
  updatedAt: number;
};

export const QUICKLOG_LOCATION_DRAFT_KEY = "quicklog_location_draft";
export const QUICKLOG_REOPEN_FLAG_KEY = "quicklog_reopen";

export function readQuickLogLocationDraft(): QuickLogLocationDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(QUICKLOG_LOCATION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuickLogLocationDraft;
    if (!parsed || typeof parsed !== "object") return null;
    if (!["off", "city", "exact"].includes(parsed.locationPrecision)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeQuickLogLocationDraft(draft: QuickLogLocationDraft) {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUICKLOG_LOCATION_DRAFT_KEY, JSON.stringify(draft));
}

export function clearQuickLogLocationDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(QUICKLOG_LOCATION_DRAFT_KEY);
}

export function consumeQuickLogReopenFlag() {
  if (typeof window === "undefined") return false;
  const val = localStorage.getItem(QUICKLOG_REOPEN_FLAG_KEY);
  if (val !== "1") return false;
  localStorage.removeItem(QUICKLOG_REOPEN_FLAG_KEY);
  return true;
}

export function setQuickLogReopenFlag() {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUICKLOG_REOPEN_FLAG_KEY, "1");
}
