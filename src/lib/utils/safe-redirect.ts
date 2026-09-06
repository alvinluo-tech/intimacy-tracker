/**
 * Sanitizes a user-supplied redirect target so it can only ever be a
 * same-origin path. Protocol-relative URLs ("//evil.com"), backslash tricks
 * ("/\evil.com") and malformed percent-encoding all fall back to the default.
 */
export function sanitizeRedirectPath(
  raw: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!raw) return fallback;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (decoded.length > 2048) return fallback;
  if (!decoded.startsWith("/")) return fallback;
  if (decoded.startsWith("//") || decoded.startsWith("/\\")) return fallback;
  return decoded;
}
