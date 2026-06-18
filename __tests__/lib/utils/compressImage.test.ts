import { describe, it, expect, vi } from "vitest";

vi.mock("browser-image-compression", () => {
  return {
    default: vi.fn().mockResolvedValue(new File(["compressed"], "photo.jpg", { type: "image/jpeg" })),
  };
});

describe("compressImage", () => {
  it("calls imageCompression with correct defaults", async () => {
    const { compressImage } = await import("@/lib/utils/compressImage");
    const imageCompression = (await import("browser-image-compression")).default;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    const result = await compressImage(file);

    expect(imageCompression).toHaveBeenCalledWith(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/jpeg",
    });
    expect(result).toBeTruthy();
  });

  it("respects custom options", async () => {
    const { compressImage } = await import("@/lib/utils/compressImage");
    const imageCompression = (await import("browser-image-compression")).default;
    const file = new File(["test"], "test.png", { type: "image/png" });

    await compressImage(file, { maxSizeMB: 2, maxWidthOrHeight: 1080 });

    expect(imageCompression).toHaveBeenCalledWith(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 1080,
      useWebWorker: true,
      fileType: "image/png",
    });
  });
});
