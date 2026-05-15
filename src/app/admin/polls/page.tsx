import { Suspense } from 'react';
import { connection } from 'next/server';
import { AdminPollsContent } from '@/components/admin/AdminPollsContent';
import { AdminDashboardSkeleton } from '../loading';

export default async function AdminPollsPage() {
  await connection();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-[#f8fafc]">
            Polls Management
          </h1>
          <p className="text-gray-500 dark:text-[#94a3b8]">
            Create and manage polls for user feedback
          </p>
        </div>
      </div>

      <Suspense fallback={<AdminDashboardSkeleton />}>
        <AdminPollsData />
      </Suspense>
    </div>
  );
}

async function AdminPollsData() {
  const { getAllPolls } = await import('@/features/polls/queries');
  const polls = await getAllPolls();

  return <AdminPollsContent polls={polls} />;
}
