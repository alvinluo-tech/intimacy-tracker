import { describe, it, expect } from "vitest";
import {
  storagePathFromValue,
  resolveWithSignedUrls,
  ownStoragePaths,
  deleteStoredObjects,
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

// Deletion runs with a client that can reach objects RLS would otherwise hide,
// so the owner-prefix rule is the only thing standing between a crafted
// `photo_url` value and destroying someone else's photos.
describe("ownStoragePaths", () => {
  it("keeps only objects under the owner's own prefix", () => {
    expect(ownStoragePaths(BUCKET, ["u-1/a.jpg", "u-2/b.jpg"], "u-1")).toEqual(["u-1/a.jpg"]);
  });

  it("does not treat a different account whose id shares a prefix as owned", () => {
    expect(ownStoragePaths(BUCKET, ["u-11/a.jpg"], "u-1")).toEqual([]);
  });

  it("resolves legacy public and signed URLs before applying the prefix rule", () => {
    expect(
      ownStoragePaths(
        BUCKET,
        [
          "https://proj.supabase.co/storage/v1/object/public/encounter-photos/u-1/a.jpg",
          "https://proj.supabase.co/storage/v1/object/sign/encounter-photos/u-2/b.jpg?token=x",
        ],
        "u-1"
      )
    ).toEqual(["u-1/a.jpg"]);
  });

  it("drops external URLs, empties and duplicates", () => {
    expect(
      ownStoragePaths(
        BUCKET,
        ["https://cdn.example.com/u-1/a.jpg", "", null, "u-1/a.jpg", "u-1/a.jpg"],
        "u-1"
      )
    ).toEqual(["u-1/a.jpg"]);
  });

  it("rejects a traversal-shaped value that would escape the owner prefix", () => {
    expect(ownStoragePaths(BUCKET, ["u-1/../../u-2/secret.jpg"], "u-1")).toEqual([]);
  });
});

describe("deleteStoredObjects", () => {
  function client(remove: (paths: string[]) => { error: unknown }) {
    const seen: string[][] = [];
    return {
      seen,
      storage: {
        from: () => ({
          remove: async (paths: string[]) => {
            seen.push(paths);
            return remove(paths);
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  it("reports nothing survived when storage accepts the delete", async () => {
    const c = client(() => ({ error: null }));
    expect(await deleteStoredObjects(c, BUCKET, ["u-1/a.jpg"], "u-1")).toEqual([]);
    expect(c.seen).toEqual([["u-1/a.jpg"]]);
  });

  it("reports every path as survived when storage errors", async () => {
    const c = client(() => ({ error: { message: "boom" } }));
    expect(await deleteStoredObjects(c, BUCKET, ["u-1/a.jpg", "u-1/b.jpg"], "u-1")).toEqual([
      "u-1/a.jpg",
      "u-1/b.jpg",
    ]);
  });

  it("never calls remove() when no object belongs to the owner", async () => {
    const c = client(() => ({ error: null }));
    expect(await deleteStoredObjects(c, BUCKET, ["u-2/a.jpg"], "u-1")).toEqual([]);
    expect(c.seen).toEqual([]);
  });

  it("does not touch storage at all for an empty value list", async () => {
    const c = client(() => ({ error: null }));
    expect(await deleteStoredObjects(c, BUCKET, [null, undefined, ""], "u-1")).toEqual([]);
    expect(c.seen).toEqual([]);
  });
});
