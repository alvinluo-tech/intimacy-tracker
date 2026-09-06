import { NextResponse } from 'next/server';
import { requireAdmin } from '@/features/admin/queries';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // get_platform_stats() takes no parameters; date/country filtering is not
  // supported by the RPC. Passing extra params made PostgREST fail with
  // PGRST202 (function not found) for any filtered request.
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc('get_platform_stats');

  if (error) {
    console.error('[admin] Error fetching platform stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }

  return NextResponse.json(data);
}
