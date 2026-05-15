'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Activity,
  MapPin,
  Vote,
  TrendingUp,
  Calendar,
  Filter,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StatsData {
  users: Record<string, number>;
  encounters: Record<string, number>;
  partners: Record<string, number>;
  polls: Record<string, number>;
  top_countries: Array<{ country: string; count: number }>;
  recent_activity: Array<{ date: string; encounters: number; new_users: number }>;
  filters: {
    start_date: string | null;
    end_date: string;
    country_code: string | null;
    is_all_time: boolean;
  };
}

const TIME_PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: null },
];

export function AdminDashboardContent() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePreset, setTimePreset] = useState('30D');
  const [countryCode, setCountryCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [availableCountries, setAvailableCountries] = useState<Array<{ country: string; count: number }>>([]);
  // Use a counter to force re-fetch
  const [fetchCounter, setFetchCounter] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      setLoading(true);
      try {
        const params = new URLSearchParams();

        // Only set start_date for preset ranges (7D, 30D, 90D)
        // "All" = no start_date (backend treats NULL as no filter)
        if (timePreset !== 'All' && timePreset !== 'custom') {
          const preset = TIME_PRESETS.find((p) => p.label === timePreset);
          if (preset?.days) {
            const start = new Date();
            start.setDate(start.getDate() - preset.days);
            params.set('start_date', start.toISOString());
          }
        }

        if (startDate) params.set('start_date', new Date(startDate).toISOString());
        if (endDate) params.set('end_date', new Date(endDate).toISOString());
        if (countryCode) params.set('country_code', countryCode);

        const url = `/api/admin/stats?${params.toString()}`;
        const response = await fetch(url);
        if (response.ok && !cancelled) {
          const data = await response.json();
          setStats(data);
          if (data.top_countries) {
            setAvailableCountries(data.top_countries);
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();

    return () => { cancelled = true; };
  }, [timePreset, countryCode, startDate, endDate, fetchCounter]);

  const handlePresetChange = (preset: string) => {
    setTimePreset(preset);
    setStartDate('');
    setEndDate('');
  };

  const handleRefresh = () => {
    setFetchCounter((c) => c + 1);
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-[#94a3b8]">
        Failed to load statistics
      </div>
    );
  }

  const users = stats.users;
  const encounters = stats.encounters;
  const partners = stats.partners;
  const polls = stats.polls;

  const statCards = [
    {
      title: 'Total Users',
      value: users.total,
      change: `+${users.new_today} today`,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      title: stats.filters.is_all_time ? 'Total Encounters' : 'Encounters in Range',
      value: encounters.in_range ?? encounters.total,
      change: `${encounters.today} today`,
      icon: Activity,
      color: 'text-rose-500',
      bgColor: 'bg-rose-50 dark:bg-rose-500/10',
    },
    {
      title: 'Active Partners',
      value: partners.active,
      change: `${partners.total} total`,
      icon: MapPin,
      color: 'text-violet-500',
      bgColor: 'bg-violet-50 dark:bg-violet-500/10',
    },
    {
      title: 'Active Polls',
      value: polls.active,
      change: `${polls.total_votes} total votes`,
      icon: Vote,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 dark:text-[#64748b]" />
            <span className="text-sm font-medium text-gray-700 dark:text-[#f8fafc]">
              Filters
            </span>
          </div>

          {/* Time Presets */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/[0.04] rounded-lg p-1">
            {TIME_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant={timePreset === preset.label ? 'primary' : 'ghost'}
                size="sm"
                className={`h-7 px-3 text-xs ${
                  timePreset === preset.label
                    ? ''
                    : 'text-gray-500 dark:text-[#94a3b8]'
                }`}
                onClick={() => handlePresetChange(preset.label)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Date Range */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value || endDate) setTimePreset('custom');
              }}
              className="h-8 text-xs w-36"
              placeholder="Start date"
            />
            <span className="text-gray-400 dark:text-[#64748b]">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (startDate || e.target.value) setTimePreset('custom');
              }}
              className="h-8 text-xs w-36"
              placeholder="End date"
            />
          </div>

          {/* Country Filter */}
          <Select
            value={countryCode || 'all'}
            onValueChange={(value) => setCountryCode(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {availableCountries.map((c) => (
                <SelectItem key={c.country} value={c.country}>
                  {c.country} ({c.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            className="bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <span className="text-xs text-gray-500 dark:text-[#94a3b8]">
                {card.change}
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-[#f8fafc] mb-1">
              {card.value.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-[#94a3b8]">
              {card.title}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-rose-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#f8fafc]">
              Activity Over Time
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.recent_activity || []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148, 163, 184, 0.1)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.slice(5)}
                  stroke="#94a3b8"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="encounters"
                  stroke="#f43f5e"
                  fill="#f43f5e"
                  fillOpacity={0.2}
                  name="Encounters"
                />
                <Area
                  type="monotone"
                  dataKey="new_users"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.2}
                  name="New Users"
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => (
                    <span className="text-xs text-gray-500 dark:text-[#94a3b8]">{value}</span>
                  )}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Countries Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-violet-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#f8fafc]">
              Top Countries
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.top_countries || []} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148, 163, 184, 0.1)"
                />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="country"
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#8b5cf6"
                  radius={[0, 4, 4, 0]}
                  name="Encounters"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Weekly & Monthly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] p-6"
        >
          <div className="text-sm text-gray-500 dark:text-[#94a3b8] mb-2">
            This Week
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-[#f8fafc]">
            {encounters.this_week}
          </div>
          <div className="text-sm text-gray-500 dark:text-[#94a3b8]">
            encounters
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.65 }}
          className="bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] p-6"
        >
          <div className="text-sm text-gray-500 dark:text-[#94a3b8] mb-2">
            This Month
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-[#f8fafc]">
            {encounters.this_month}
          </div>
          <div className="text-sm text-gray-500 dark:text-[#94a3b8]">
            encounters
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] p-6"
        >
          <div className="text-sm text-gray-500 dark:text-[#94a3b8] mb-2">
            New Users This Month
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-[#f8fafc]">
            {users.new_this_month}
          </div>
          <div className="text-sm text-gray-500 dark:text-[#94a3b8]">
            registrations
          </div>
        </motion.div>
      </div>
    </div>
  );
}
