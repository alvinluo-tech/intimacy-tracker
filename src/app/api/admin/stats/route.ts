import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/features/admin/queries';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const countryCode = searchParams.get('country_code');

  const supabase = createSupabaseAdminClient();

  const rpcParams: Record<string, unknown> = {};
  if (startDate) rpcParams.p_start_date = startDate;
  if (endDate) rpcParams.p_end_date = endDate;
  if (countryCode) rpcParams.p_country_code = countryCode;

  const { data, error } = await supabase.rpc('get_platform_stats', rpcParams);

  if (error) {
    console.error('[admin] Error fetching platform stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }

  return NextResponse.json(data);
}
