import { describe, it, expect } from "vitest";

import { isDynamicRenderingBailout } from "@/lib/utils/dynamic-bailout";

describe("isDynamicRenderingBailout", () => {
  it("recognizes the cookies() prerender rejection Next actually emits", () => {
    const error = new Error(
      "During prerendering, `cookies()` rejects when the prerender is complete. Typically these " +
        "errors are handled by React but if you move `cookies()` to a different context by using " +
        "`setTimeout`, `after`, or similar functions you may observe this error and you should " +
        "handle it in that context. This occurred at route \"/api/partners\"."
    );
    expect(isDynamicRenderingBailout(error)).toBe(true);
  });

  it.each(["DYNAMIC_SERVER_USAGE", "HANGING_PROMISE_REJECTION", "staticGeneration"])(
    "recognizes digest %s",
    (digest) => {
      expect(isDynamicRenderingBailout(Object.assign(new Error("hidden"), { digest }))).toBe(true);
    }
  );

  it("treats a real query failure as a real failure", () => {
    expect(isDynamicRenderingBailout(new Error("Failed to fetch partners"))).toBe(false);
    expect(isDynamicRenderingBailout(new Error("relation \"profiles\" does not exist"))).toBe(false);
  });

  it("tolerates non-error throwables", () => {
    expect(isDynamicRenderingBailout(null)).toBe(false);
    expect(isDynamicRenderingBailout(undefined)).toBe(false);
    expect(isDynamicRenderingBailout("boom")).toBe(false);
    expect(isDynamicRenderingBailout(42)).toBe(false);
    expect(isDynamicRenderingBailout({ digest: null })).toBe(false);
  });
});
