const DYNAMIC_RENDERING_MARKERS = [
  "DYNAMIC_SERVER_USAGE",
  "HANGING_PROMISE_REJECTION",
  "staticGeneration",
  "During prerendering, `cookies()` rejects",
  "During prerendering, `headers()` rejects",
  "cannot be extracted statically",
];

/**
 * Next aborts a prerender by rejecting the promise that `cookies()` /
 * `headers()` returned, then expects that rejection to propagate so it can fall
 * back to a dynamic render. It is control flow, not a fault.
 *
 * A handler that wraps its whole body in try/catch turns it into a 500 and logs
 * a fabricated error — which is what `next build` reported for /api/partners and
 * /api/report/data. Re-throw these so React can do what it was asking for.
 *
 * Matching is deliberately generous: the failure mode of a false positive is a
 * proper dynamic render, while the failure mode of a false negative is a 500
 * served where the page was fine.
 */
export function isDynamicRenderingBailout(error: unknown): boolean {
  const candidate = error as { digest?: unknown; message?: unknown } | null;
  if (typeof candidate?.digest === "string" && DYNAMIC_RENDERING_MARKERS.includes(candidate.digest)) {
    return true;
  }

  const text =
    error instanceof Error ? error.message : typeof candidate?.message === "string" ? candidate.message : "";
  if (!text) return false;
  return DYNAMIC_RENDERING_MARKERS.some((marker) => text.includes(marker));
}
