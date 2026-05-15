import { redirect } from 'next/navigation';
import { getAdminUser } from '@/features/admin/queries';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();

  if (!admin) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]">
      <AdminSidebar />
      <div className="lg:pl-64">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
