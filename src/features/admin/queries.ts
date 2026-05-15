import { getServerUser } from '@/features/auth/queries';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type AdminUser = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await getServerUser();
  if (!user) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) {
    throw new Error('Not authorized: admin access required');
  }
  return admin;
}
