/**
 * crypto.randomUUID() is only available in secure contexts (HTTPS / localhost).
 * Self-hosted deployments over plain HTTP would throw, so fall back to a
 * timestamp + random-suffix id.
 */
export function safeRandomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
