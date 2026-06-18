import { describe, it, expect } from "vitest";
import { PIN_UNLOCK_COOKIE } from "@/lib/auth/pin-session";

describe("PIN_UNLOCK_COOKIE", () => {
  it("exports the correct cookie name", () => {
    expect(PIN_UNLOCK_COOKIE).toBe("it_pin_unlocked");
  });

  it("is a string", () => {
    expect(typeof PIN_UNLOCK_COOKIE).toBe("string");
  });
});
