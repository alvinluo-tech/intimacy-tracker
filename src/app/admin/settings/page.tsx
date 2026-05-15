import { AdminSettingsContent } from '@/components/admin/AdminSettingsContent';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-[#f8fafc]">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-[#94a3b8]">
          Platform configuration and settings
        </p>
      </div>

      <AdminSettingsContent />
    </div>
  );
}
