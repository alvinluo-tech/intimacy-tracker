import { Suspense } from 'react';
import { connection } from 'next/server';
import { AdminDashboardContent } from '@/components/admin/AdminDashboardContent';
import { AdminDashboardSkeleton } from './loading';

export default async function AdminDashboardPage() {
  await connection();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-[#f8fafc]">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-[#94a3b8]">
          Platform overview and statistics
        </p>
      </div>

      <AdminDashboardContent />
    </div>
  );
}
