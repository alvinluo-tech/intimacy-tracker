'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Shield, Bell, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminSettingsContent() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowNewRegistrations: true,
    maxPollOptions: 10,
    pollDurationDays: 30,
  });

  const handleSave = async () => {
    // TODO: Implement settings save
    alert('Settings saved (not implemented yet)');
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid gap-6"
      >
        {/* General Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-rose-500" />
              <CardTitle>General Settings</CardTitle>
            </div>
            <CardDescription>
              Configure general platform settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-gray-500 dark:text-[#94a3b8]">
                  Enable maintenance mode to restrict access
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, maintenanceMode: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow New Registrations</Label>
                <p className="text-sm text-gray-500 dark:text-[#94a3b8]">
                  Allow new users to register on the platform
                </p>
              </div>
              <Switch
                checked={settings.allowNewRegistrations}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    allowNewRegistrations: checked,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Poll Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-500" />
              <CardTitle>Poll Settings</CardTitle>
            </div>
            <CardDescription>
              Configure poll-related settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="maxOptions">Maximum Poll Options</Label>
              <Input
                id="maxOptions"
                type="number"
                value={settings.maxPollOptions}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maxPollOptions: parseInt(e.target.value),
                  }))
                }
                min={2}
                max={20}
              />
              <p className="text-sm text-gray-500 dark:text-[#94a3b8]">
                Maximum number of options allowed per poll
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pollDuration">Default Poll Duration (days)</Label>
              <Input
                id="pollDuration"
                type="number"
                value={settings.pollDurationDays}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    pollDurationDays: parseInt(e.target.value),
                  }))
                }
                min={1}
                max={365}
              />
              <p className="text-sm text-gray-500 dark:text-[#94a3b8]">
                Default duration for new polls (in days)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure notification settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-[#94a3b8]">
              Notification settings will be available in a future update.
            </p>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              <CardTitle>Database</CardTitle>
            </div>
            <CardDescription>
              Database management and backups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-[#94a3b8]">
              Database management features will be available in a future update.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  );
}
