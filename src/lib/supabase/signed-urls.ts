import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

// Intentional `any` generics: this helper must accept both the authenticated
// client and the schema-typed admin/service-role client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlexibleSupabaseClient = SupabaseClient<any, any, any>;

/**
 * Extracts a storage object path from a stored *_url value.
 *
 * Columns hold either a legacy full public URL
 * (`https://…/storage/v1/object/public/<bucket>/<path>`), an already-signed
 * URL, or a bare object path (`<user-id>/<file>`). Values pointing outside
 * Supabase storage (external URLs) return null and are passed through.
 */
export function storagePathFromValue(value: string, bucket: string): string | null {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    const publicMarker = `/storage/v1/object/public/${bucket}/`;
    const signedMarker = `/storage/v1/object/sign/${bucket}/`;
    if (value.includes(publicMarker)) {
      return value.split(publicMarker)[1]?.split("?")[0] ?? null;
    }
    if (value.includes(signedMarker)) {
      const raw = value.split(signedMarker)[1]?.split("?")[0] ?? "";
      try {
        const decoded = decodeURIComponent(raw);
        return decoded || null;
      } catch {
        // Malformed percent-encoding — use the raw path
        return raw || null;
      }
    }
    return null;
  }
  return value.replace(/^\/+/, "");
}

/**
 * Signs every storage path found in `values` for the given bucket and returns
 * a path → signed URL map. Non-storage values are ignored.
 */
export async function signStorageObjects(
  supabase: FlexibleSupabaseClient,
  bucket: string,
  values: Array<string | null | undefined>,
  ttl: number = DEFAULT_TTL_SECONDS
): Promise<Record<string, string>> {
  const paths = Array.from(
    new Set(
      values
        .filter((v): v is string => Boolean(v))
        .map((v) => storagePathFromValue(v, bucket))
        .filter((p): p is string => Boolean(p))
    )
  );
  if (paths.length === 0) return {};

  const signed: Record<string, string> = {};
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, ttl);
    if (error) {
      console.error(`[signed-urls] failed to sign ${bucket} paths:`, error);
      return signed;
    }
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) {
        signed[item.path] = item.signedUrl;
      }
    }
  } catch (err) {
    console.error(`[signed-urls] failed to sign ${bucket} paths:`, err);
  }
  return signed;
}

/**
 * Maps a stored *_url value to a viewable URL using the signed map; values
 * that are not storage paths (external URLs) pass through unchanged.
 */
export function resolveWithSignedUrls(
  value: string | null | undefined,
  bucket: string,
  signed: Record<string, string>
): string | null {
  if (!value) return null;
  const path = storagePathFromValue(value, bucket);
  if (path && signed[path]) return signed[path];
  return value;
}
