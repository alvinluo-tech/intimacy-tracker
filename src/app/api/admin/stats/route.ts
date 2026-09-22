import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/features/admin/queries';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isDynamicRenderingBailout } from '@/lib/utils/dynamic-bailout';

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch (adminError) {
    if (isDynamicRenderingBailout(adminError)) throw adminError;
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Date/country filters are applied inside the parameterized RPC (0053).
  // Each param is validated independently: one invalid value must not
  // silently drop the valid siblings.
  const url = new URL(request.url);
  const startDateRaw = url.searchParams.get('start_date');
  const endDateRaw = url.searchParams.get('end_date');
  const countryCodeRaw = url.searchParams.get('country_code');

  const dateSchema = z.string().datetime({ offset: true });
  const countrySchema = z.string().regex(/^[A-Za-z]{2}$/);

  const startDate = startDateRaw && dateSchema.safeParse(startDateRaw).success ? startDateRaw : undefined;
  if (startDateRaw && !startDate) {
    console.warn('[admin/stats] invalid start_date ignored:', startDateRaw);
  }
  const endDate = endDateRaw && dateSchema.safeParse(endDateRaw).success ? endDateRaw : undefined;
  if (endDateRaw && !endDate) {
    console.warn('[admin/stats] invalid end_date ignored:', endDateRaw);
  }
  const countryCode =
    countryCodeRaw && countrySchema.safeParse(countryCodeRaw).success ? countryCodeRaw.toUpperCase() : undefined;
  if (countryCodeRaw && !countryCode) {
    console.warn('[admin/stats] invalid country_code ignored:', countryCodeRaw);
  }

  const hasFilters = Boolean(startDate || endDate || countryCode);
  const filters = hasFilters
    ? {
        p_start_date: startDate ?? null,
        p_end_date: endDate ?? null,
        p_country_code: countryCode ?? null,
      }
    : {};

  const supabase = createSupabaseAdminClient();
  let { data, error } = await supabase.rpc('get_platform_stats', filters);
  // Migration 0053 (parameterized overload) not applied yet — fall back to the
  // zero-argument version so deploys don't have to be ordered.
  let usedFallback = false;
  if ((error as { code?: string } | null)?.code === 'PGRST202') {
    const retry = await supabase.rpc('get_platform_stats');
    data = retry.data;
    error = retry.error;
    usedFallback = true;
  }

  if (error) {
    console.error('[admin] Error fetching platform stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }

  // Enrich with the fields the admin dashboard renders: with 0053 the RPC's
  // `encounters.total` is already the date/country-filtered count. When the
  // fallback RPC ran (unfiltered), label the data as all-time regardless of
  // what the client requested.
  const body =
    typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : {};
  const encountersBody =
    typeof body.encounters === 'object' && body.encounters !== null
      ? (body.encounters as Record<string, unknown>)
      : {};
  const isAllTime = usedFallback || !hasFilters;

  return NextResponse.json({
    ...body,
    filters: { is_all_time: isAllTime },
    encounters: { ...encountersBody, in_range: encountersBody.total ?? 0 },
  });
}
