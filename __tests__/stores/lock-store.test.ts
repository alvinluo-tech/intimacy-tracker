import { describe, it, expect, beforeEach } from "vitest";
import { useLockStore } from "@/stores/lock-store";

describe("useLockStore", () => {
  beforeEach(() => {
    useLockStore.setState({ unlocked: false });
  });

  it("starts locked", () => {
    expect(useLockStore.getState().unlocked).toBe(false);
  });

  it("unlock sets unlocked to true", () => {
    useLockStore.getState().unlock();
    expect(useLockStore.getState().unlocked).toBe(true);
  });

  it("lock sets unlocked to false", () => {
    useLockStore.getState().unlock();
    useLockStore.getState().lock();
    expect(useLockStore.getState().unlocked).toBe(false);
  });
});
