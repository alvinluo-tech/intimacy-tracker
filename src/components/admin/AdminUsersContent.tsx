'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  MoreHorizontal,
  User,
  Mail,
  Calendar,
  Activity,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  encounter_count: number;
  partner_count: number;
}

interface AdminUsersContentProps {
  users: UserData[];
}

export function AdminUsersContent({ users: initialUsers }: AdminUsersContentProps) {
  const [users] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#64748b]" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users by email or ID..."
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/[0.06]">
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-[#94a3b8]">
                  User
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-[#94a3b8]">
                  Joined
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-[#94a3b8]">
                  Last Active
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-[#94a3b8]">
                  Encounters
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-[#94a3b8]">
                  Partners
                </th>
                <th className="text-right py-4 px-6 text-sm font-medium text-gray-500 dark:text-[#94a3b8]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-gray-500 dark:text-[#94a3b8]"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    className="border-b border-gray-100 dark:border-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400 dark:text-[#64748b]" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-[#f8fafc]">
                            {user.email || 'No email'}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-[#64748b] font-mono">
                            {user.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-[#94a3b8]">
                        <Calendar className="w-4 h-4" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-[#94a3b8]">
                        <Activity className="w-4 h-4" />
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : 'Never'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-gray-900 dark:text-[#f8fafc]">
                        {user.encounter_count}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-gray-900 dark:text-[#f8fafc]">
                        {user.partner_count}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="px-2">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <User className="w-4 h-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-[#94a3b8]">
        <span>
          Showing {filteredUsers.length} of {users.length} users
        </span>
      </div>
    </div>
  );
}
