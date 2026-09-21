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
 * A database row going away is not the same as the photo going away. Objects
 * that survive a deletion are still reachable by path, so callers must not treat
 * them as erased — log them, and check the returned list where the UI promises a
 * wipe.
 */
export function warnUndeletedObjects(scope: string, failed: string[]): string[] {
  if (failed.length > 0) {
    console.error(
      `[${scope}] ${failed.length} storage object(s) survived and still hold photo data:`,
      failed
    );
  }
  return failed;
}

/**
 * Resolves stored `*_url` values to object paths that belong to `ownerId`.
 *
 * Two classes of value are dropped: anything that is not a Supabase storage
 * reference (`storagePathFromValue` returns null for external URLs), and
 * anything outside the owner's own `<userId>/` prefix. Callers delete with the
 * service-role client, which bypasses storage RLS, and `photo_url` is only
 * length-validated before it reaches here — without the prefix check a user
 * could point a row at another account's object and have us destroy it.
 */
export function ownStoragePaths(
  bucket: string,
  values: Array<string | null | undefined>,
  ownerId: string
): string[] {
  const prefix = `${ownerId}/`;
  return Array.from(
    new Set(
      values
        .filter((v): v is string => Boolean(v))
        .map((v) => storagePathFromValue(v, bucket))
        .filter((p): p is string => p !== null && p.startsWith(prefix))
        // `u-1/../../u-2/x.jpg` satisfies the prefix test yet resolves outside
        // the owner, so reject traversal segments before handing paths to storage.
        .filter((p) => !p.split("/").includes(".."))
    )
  );
}

/**
 * Deletes the owner's objects referenced by `values`.
 * Returns the paths that survived, so callers never claim a wipe that did not happen.
 */
export async function deleteStoredObjects(
  supabase: FlexibleSupabaseClient,
  bucket: string,
  values: Array<string | null | undefined>,
  ownerId: string
): Promise<string[]> {
  const paths = ownStoragePaths(bucket, values, ownerId);
  if (paths.length === 0) return [];

  try {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    // Storage reports only a wholesale failure here, so anything short of a
    // clean response is treated as "nothing was deleted" rather than as a wipe.
    return error ? paths : [];
  } catch {
    return paths;
  }
}

/**
 * Removes every object under `<ownerId>/` in each bucket, by listing rather than
 * by trusting database rows. Row deletes cascade in Postgres, so after a partial
 * erasure the paths only exist in storage — the listing is the sweep that can
 * still find them, and it is re-runnable.
 * Returns `bucket/path` labels for objects that could not be removed.
 */
export async function purgeUserObjects(
  supabase: FlexibleSupabaseClient,
  buckets: string[],
  ownerId: string
): Promise<string[]> {
  const failed: string[] = [];
  const pageSize = 1000;

  for (const bucket of buckets) {
    // Objects live flat under `<ownerId>/`, so this prefix listing is the whole
    // set. Re-listing from the top each round avoids the offset drift that
    // deleting-while-paging would cause.
    for (;;) {
      const { data, error } = await supabase
        .storage.from(bucket)
        .list(ownerId, { limit: pageSize });
      if (error) {
        failed.push(`${bucket}:*`);
        break;
      }
      const paths = (data ?? [])
        .filter((f) => f.id)
        .map((f) => `${ownerId}/${f.name}`);
      if (paths.length === 0) break;

      const survived = await deleteStoredObjects(supabase, bucket, paths, ownerId);
      failed.push(...survived.map((p) => `${bucket}/${p}`));
    }
  }

  return failed;
}
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
