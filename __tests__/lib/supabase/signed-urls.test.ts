import { describe, it, expect } from "vitest";
import {
  storagePathFromValue,
  resolveWithSignedUrls,
} from "@/lib/supabase/signed-urls";

const BUCKET = "encounter-photos";
const SIGNED = {
  "user-1/abc.jpg": "https://proj.supabase.co/storage/v1/object/sign/encounter-photos/user-1/abc.jpg?token=x",
};

describe("storagePathFromValue", () => {
  it("extracts the path from a legacy public URL", () => {
    const url = "https://proj.supabase.co/storage/v1/object/public/encounter-photos/user-1/abc.jpg";
    expect(storagePathFromValue(url, BUCKET)).toBe("user-1/abc.jpg");
  });

  it("extracts and decodes the path from a signed URL", () => {
    const url = "https://proj.supabase.co/storage/v1/object/sign/encounter-photos/user-1/a%20b.jpg?token=x";
    expect(storagePathFromValue(url, BUCKET)).toBe("user-1/a b.jpg");
  });

  it("accepts bare storage paths", () => {
    expect(storagePathFromValue("user-1/abc.jpg", BUCKET)).toBe("user-1/abc.jpg");
    expect(storagePathFromValue("/user-1/abc.jpg", BUCKET)).toBe("user-1/abc.jpg");
  });

  it("returns null for foreign URLs", () => {
    expect(storagePathFromValue("https://cdn.example.com/img.png", BUCKET)).toBeNull();
  });

  it("returns null for empty values", () => {
    expect(storagePathFromValue("", BUCKET)).toBeNull();
  });

  it("does not extract when the URL belongs to another bucket", () => {
    const url = "https://proj.supabase.co/storage/v1/object/public/avatars/user-1/me.png";
    expect(storagePathFromValue(url, BUCKET)).toBeNull();
  });
});

describe("resolveWithSignedUrls", () => {
  it("returns the signed URL for a stored path", () => {
    expect(resolveWithSignedUrls("user-1/abc.jpg", BUCKET, SIGNED)).toBe(SIGNED["user-1/abc.jpg"]);
  });

  it("returns the signed URL for a legacy public URL", () => {
    const legacy = "https://proj.supabase.co/storage/v1/object/public/encounter-photos/user-1/abc.jpg";
    expect(resolveWithSignedUrls(legacy, BUCKET, SIGNED)).toBe(SIGNED["user-1/abc.jpg"]);
  });

  it("passes through external URLs untouched", () => {
    expect(resolveWithSignedUrls("https://cdn.example.com/img.png", BUCKET, SIGNED)).toBe(
      "https://cdn.example.com/img.png"
    );
  });

  it("falls back to the original value when signing failed", () => {
    expect(resolveWithSignedUrls("user-1/missing.jpg", BUCKET, SIGNED)).toBe("user-1/missing.jpg");
  });

  it("returns null for null input", () => {
    expect(resolveWithSignedUrls(null, BUCKET, SIGNED)).toBeNull();
  });
});
