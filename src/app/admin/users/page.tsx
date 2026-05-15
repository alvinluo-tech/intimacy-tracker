import { Suspense } from 'react';
import { connection } from 'next/server';
import { AdminUsersContent } from '@/components/admin/AdminUsersContent';
import { AdminDashboardSkeleton } from '../loading';

export default async function AdminUsersPage() {
  await connection();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-[#f8fafc]">
          Users Management
        </h1>
        <p className="text-gray-500 dark:text-[#94a3b8]">
          View and manage platform users
        </p>
      </div>

      <Suspense fallback={<AdminDashboardSkeleton />}>
        <AdminUsersData />
      </Suspense>
    </div>
  );
}

async function AdminUsersData() {
  const { createSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createSupabaseAdminClient();

  // Fetch all users from auth.users
  const { data: authData, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError || !authData) {
    console.error('[admin] Error fetching users:', usersError);
    return <AdminUsersContent users={[]} />;
  }

  // Fetch encounter counts per user
  const { data: encounterCounts } = await supabase
    .from('encounters')
    .select('user_id');

  // Fetch partner counts per user
  const { data: partnerCounts } = await supabase
    .from('partners')
    .select('user_id');

  // Count occurrences
  const encounterMap: Record<string, number> = {};
  if (encounterCounts) {
    for (const row of encounterCounts) {
      if (row.user_id) {
        encounterMap[row.user_id] = (encounterMap[row.user_id] || 0) + 1;
      }
    }
  }

  const partnerMap: Record<string, number> = {};
  if (partnerCounts) {
    for (const row of partnerCounts) {
      if (row.user_id) {
        partnerMap[row.user_id] = (partnerMap[row.user_id] || 0) + 1;
      }
    }
  }

  // Combine data
  const users = authData.users.map((user) => ({
    id: user.id,
    email: user.email || '',
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at || null,
    encounter_count: encounterMap[user.id] || 0,
    partner_count: partnerMap[user.id] || 0,
  }));

  // Sort by created_at descending
  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return <AdminUsersContent users={users} />;
}
