import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/features/admin/queries';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Date/country filters are applied inside the parameterized RPC (0053).
  const url = new URL(request.url);
  const parsed = z
    .object({
      start_date: z.string().datetime().optional(),
      end_date: z.string().datetime().optional(),
      country_code: z.string().regex(/^[A-Za-z]{2}$/).optional(),
    })
    .safeParse(Object.fromEntries(url.searchParams));

  const supabase = createSupabaseAdminClient();
  const filters = parsed.success
    ? {
        p_start_date: parsed.data.start_date ?? null,
        p_end_date: parsed.data.end_date ?? null,
        p_country_code: parsed.data.country_code?.toUpperCase() ?? null,
      }
    : {};
  let { data, error } = await supabase.rpc('get_platform_stats', filters);
  // Migration 0053 (parameterized overload) not applied yet — fall back to the
  // zero-argument version so deploys don't have to be ordered.
  if ((error as { code?: string } | null)?.code === 'PGRST202') {
    const retry = await supabase.rpc('get_platform_stats');
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('[admin] Error fetching platform stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }

  return NextResponse.json(data);
}
