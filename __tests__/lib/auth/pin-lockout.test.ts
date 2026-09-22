import { describe, it, expect } from "vitest";

import {
  incrementAttemptCounterAtomically,
  lockoutSecondsFor,
  MAX_PIN_ATTEMPTS,
  PIN_LOCKOUT_DURATIONS,
} from "@/lib/auth/pin-lockout";

const COLUMNS = new Set(["pin_attempts", "pin_reset_attempts"]);

/**
 * Stand-in for the service-role client. `reads[i]` is what row the i-th SELECT
 * sees, `matched[i]` is how many rows the i-th UPDATE's filters matched — 0
 * means someone else changed the counter first, which is the case the old
 * read-then-write silently ignored.
 */
function fakeAdmin(reads: Array<{ stored: number } | { error: unknown }>, matched: number[]) {
  let readIndex = 0;
  let writeIndex = 0;
  const casValues: number[] = [];
  const writtenValues: number[] = [];

  const client = {
    from: () => {
      const query: Record<string, unknown> = {
        select: () => query,
        update: (values: Record<string, number>) => {
          writtenValues.push(values.pin_attempts ?? values.pin_reset_attempts);
          return query;
        },
        eq: (column: string, value: unknown) => {
          if (COLUMNS.has(column)) casValues.push(Number(value));
          return query;
        },
        maybeSingle: async () => {
          const step = reads[Math.min(readIndex++, reads.length - 1)];
          if ("error" in step) return { data: null, error: step.error };
          return {
            data: { pin_attempts: step.stored, pin_reset_attempts: step.stored },
            error: null,
          };
        },
        then: (resolve: (value: unknown) => void) => {
          resolve({ count: matched[Math.min(writeIndex++, matched.length - 1)], error: null });
        },
      };
      return query;
    },
  };

  return {
    client: client as never,
    casValues,
    writtenValues,
  };
}

describe("incrementAttemptCounterAtomically", () => {
  it("advances from the value it read and pins the write to that value", async () => {
    const { client, casValues, writtenValues } = fakeAdmin([{ stored: 0 }], [1]);

    expect(await incrementAttemptCounterAtomically(client, "user-1", "pin_attempts")).toBe(1);
    expect(writtenValues).toEqual([1]);
    expect(casValues).toEqual([0]);
  });

  it("re-reads after losing the race instead of overwriting the winner", async () => {
    // Two parallel guesses both read 1; the loser's compare-and-swap matches 0
    // rows, so it must retry against the now-current value rather than write 2.
    const { client, casValues } = fakeAdmin([{ stored: 1 }, { stored: 2 }], [0, 1]);

    expect(await incrementAttemptCounterAtomically(client, "user-1", "pin_attempts")).toBe(3);
    expect(casValues).toEqual([1, 2]);
  });

  it("counts the guess even when the stored counter is null", async () => {
    const { client } = fakeAdmin([{ stored: null as never }], [1]);
    expect(await incrementAttemptCounterAtomically(client, "user-1", "pin_attempts")).toBe(1);
  });

  it("fails closed when the counter cannot be read", async () => {
    const { client, writtenValues } = fakeAdmin([{ error: { message: "boom" } }], [1]);

    expect(await incrementAttemptCounterAtomically(client, "user-1", "pin_attempts")).toBeNull();
    expect(writtenValues).toEqual([]);
  });

  it("gives up rather than blind-writing after repeated conflicts", async () => {
    const { client, casValues, writtenValues } = fakeAdmin([{ stored: 1 }], [0]);

    expect(await incrementAttemptCounterAtomically(client, "user-1", "pin_attempts")).toBeNull();
    // Bounded retries, all still compare-and-swap — never an unconditional write.
    expect(writtenValues.length).toBeLessThanOrEqual(4);
    expect(casValues.every((value) => value === 1)).toBe(true);
  });

  it("targets the column it was given", async () => {
    const { client, writtenValues } = fakeAdmin([{ stored: 4 }], [1]);
    await incrementAttemptCounterAtomically(client, "user-1", "pin_reset_attempts");
    expect(writtenValues).toEqual([5]);
  });
});

describe("lockoutSecondsFor", () => {
  it.each([
    [MAX_PIN_ATTEMPTS, 60],
    [MAX_PIN_ATTEMPTS * 2, 300],
    [MAX_PIN_ATTEMPTS * 3, 900],
    [MAX_PIN_ATTEMPTS * 4, 3600],
  ])("escalates after every spent budget (attempts=%i)", (attempts, expected) => {
    expect(lockoutSecondsFor(attempts, MAX_PIN_ATTEMPTS)).toBe(expected);
  });

  it("never exceeds the longest defined window", () => {
    expect(lockoutSecondsFor(MAX_PIN_ATTEMPTS * 99, MAX_PIN_ATTEMPTS)).toBe(
      PIN_LOCKOUT_DURATIONS[PIN_LOCKOUT_DURATIONS.length - 1]
    );
  });
});
