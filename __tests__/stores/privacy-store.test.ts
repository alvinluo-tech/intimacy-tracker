import { describe, it, expect, beforeEach } from "vitest";
import { usePrivacyStore } from "@/stores/privacy-store";

describe("usePrivacyStore", () => {
  beforeEach(() => {
    usePrivacyStore.setState({ blurEnabled: false });
  });

  it("starts with blur disabled", () => {
    expect(usePrivacyStore.getState().blurEnabled).toBe(false);
  });

  it("toggleBlur enables blur", () => {
    usePrivacyStore.getState().toggleBlur();
    expect(usePrivacyStore.getState().blurEnabled).toBe(true);
  });

  it("toggleBlur disables blur when already enabled", () => {
    usePrivacyStore.getState().toggleBlur();
    usePrivacyStore.getState().toggleBlur();
    expect(usePrivacyStore.getState().blurEnabled).toBe(false);
  });
});
