export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] p-6"
          >
            <div className="h-4 bg-gray-200 dark:bg-white/[0.06] rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 dark:bg-white/[0.06] rounded w-16 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-white/[0.06] rounded w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] p-6">
          <div className="h-4 bg-gray-200 dark:bg-white/[0.06] rounded w-32 mb-4" />
          <div className="h-64 bg-gray-200 dark:bg-white/[0.06] rounded" />
        </div>
        <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] p-6">
          <div className="h-4 bg-gray-200 dark:bg-white/[0.06] rounded w-32 mb-4" />
          <div className="h-64 bg-gray-200 dark:bg-white/[0.06] rounded" />
        </div>
      </div>
    </div>
  );
}

export default function AdminLoading() {
  return <AdminDashboardSkeleton />;
}
