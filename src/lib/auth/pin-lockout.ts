import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const MAX_PIN_ATTEMPTS = 5;
export const MAX_RESET_CODE_ATTEMPTS = 5;
export const PIN_LOCKOUT_DURATIONS = [60, 300, 900, 3600]; // 1min, 5min, 15min, 1hr

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/** How many parallel guesses one account may make before the counter gives up. */
const CAS_ROUNDS = 4;

/**
 * Advances an attempts counter without ever losing a concurrent increment.
 *
 * The previous read-then-write let N parallel wrong guesses all read
 * `attempts = 1` and all write 2, so the counter never moved past 2 — and the
 * escalating lockout behind it never fired. That makes a 4-6 digit PIN
 * guessable without any practical limit, which is the whole point of the lock.
 * Compare-and-swap on the value just read, and re-read when someone else won.
 *
 * Returns null when the counter could not be advanced, so callers fail closed
 * rather than handing back a guess that was never recorded.
 */
export async function incrementAttemptCounterAtomically(
  admin: AdminClient,
  userId: string,
  column: "pin_attempts" | "pin_reset_attempts"
): Promise<number | null> {
  for (let round = 0; round < CAS_ROUNDS; round++) {
    const { data, error } = await admin
      .from("profiles")
      .select(column)
      .eq("id", userId)
      .maybeSingle();
    if (error) return null;

    // The column is a parameter, so the generated row type comes back as a union
    // of single-key objects that cannot be indexed by `column`.
    const row = data as Record<string, unknown> | null;
    const observed = Number(row?.[column] ?? 0);
    const next = observed + 1;

    const { count, error: updateErr } = await admin
      .from("profiles")
      .update({ [column]: next }, { count: "exact" })
      .eq("id", userId)
      .eq(column, observed);
    if (updateErr) return null;
    if ((count ?? 0) > 0) return next;
  }
  return null;
}

/** Lockout window for a given attempt count, escalating every full budget. */
export function lockoutSecondsFor(attempts: number, maxAttempts: number): number {
  const tier = Math.floor(attempts / maxAttempts) - 1;
  return PIN_LOCKOUT_DURATIONS[Math.min(Math.max(tier, 0), PIN_LOCKOUT_DURATIONS.length - 1)];
}
