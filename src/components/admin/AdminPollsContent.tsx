'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { PollResults, CreatePollInput } from '@/features/polls/types';

interface AdminPollsContentProps {
  polls: PollResults[];
}

export function AdminPollsContent({ polls: initialPolls }: AdminPollsContentProps) {
  const [polls, setPolls] = useState(initialPolls);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPoll, setNewPoll] = useState<CreatePollInput>({
    title: '',
    description: '',
    poll_type: 'single',
    options: ['', ''],
  });

  const handleCreatePoll = async () => {
    if (!newPoll.title || newPoll.options.filter(Boolean).length < 2) {
      alert('Please fill in the title and at least 2 options');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPoll,
          options: newPoll.options.filter(Boolean),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh polls
        const pollsResponse = await fetch('/api/admin/polls');
        const updatedPolls = await pollsResponse.json();
        setPolls(updatedPolls);
        setIsCreateDialogOpen(false);
        setNewPoll({
          title: '',
          description: '',
          poll_type: 'single',
          options: ['', ''],
        });
      } else {
        alert(result.error || 'Failed to create poll');
      }
    } catch (error) {
      console.error('Error creating poll:', error);
      alert('Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (pollId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/admin/polls', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pollId, is_active: !isActive }),
      });

      const result = await response.json();

      if (result.success) {
        setPolls((prev) =>
          prev.map((p) =>
            p.poll.id === pollId
              ? { ...p, poll: { ...p.poll, is_active: !isActive } }
              : p
          )
        );
      }
    } catch (error) {
      console.error('Error toggling poll:', error);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to delete this poll?')) return;

    try {
      const response = await fetch(`/api/admin/polls?id=${pollId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setPolls((prev) => prev.filter((p) => p.poll.id !== pollId));
      }
    } catch (error) {
      console.error('Error deleting poll:', error);
    }
  };

  const addOption = () => {
    setNewPoll((prev) => ({
      ...prev,
      options: [...prev.options, ''],
    }));
  };

  const removeOption = (index: number) => {
    if (newPoll.options.length <= 2) return;
    setNewPoll((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const updateOption = (index: number, value: string) => {
    setNewPoll((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? value : opt)),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Create Poll Button */}
      <div className="flex justify-end">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Poll
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Poll</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newPoll.title}
                  onChange={(e) =>
                    setNewPoll((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter poll title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={newPoll.description || ''}
                  onChange={(e) =>
                    setNewPoll((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Enter poll description"
                />
              </div>

              <div className="space-y-2">
                <Label>Poll Type</Label>
                <Select
                  value={newPoll.poll_type}
                  onValueChange={(value: 'single' | 'multiple') =>
                    setNewPoll((prev) => ({ ...prev, poll_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Choice</SelectItem>
                    <SelectItem value="multiple">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Options</Label>
                <div className="space-y-2">
                  {newPoll.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {newPoll.options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2"
                          onClick={() => removeOption(index)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={addOption}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreatePoll} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Poll'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Polls List */}
      <div className="space-y-4">
        {polls.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-[#94a3b8]">
            No polls created yet
          </div>
        ) : (
          polls.map((pollData, index) => {
            const poll = pollData.poll;
            const totalVotes = poll.total_votes;

            return (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-[#f8fafc]">
                        {poll.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          poll.is_active
                            ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-[#94a3b8]'
                        }`}
                      >
                        {poll.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {poll.poll_type === 'single' ? 'Single' : 'Multiple'}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                      </span>
                    </div>

                    {poll.description && (
                      <p className="text-sm text-gray-500 dark:text-[#94a3b8] mb-3">
                        {poll.description}
                      </p>
                    )}

                    <div className="space-y-2">
                      {pollData.options.map((option) => {
                        const percentage = totalVotes > 0
                          ? Math.round((option.vote_count / totalVotes) * 100)
                          : 0;

                        return (
                          <div key={option.id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-[#94a3b8]">
                                {option.option_text}
                              </span>
                              <span className="text-gray-500 dark:text-[#64748b] font-medium">
                                {option.vote_count} ({percentage}%)
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-rose-500 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-400 dark:text-[#64748b]">
                      <span>
                        Created: {new Date(poll.created_at).toLocaleDateString()}
                      </span>
                      {poll.ends_at && (
                        <span>
                          Ends: {new Date(poll.ends_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={poll.is_active}
                      onCheckedChange={() =>
                        handleToggleActive(poll.id, poll.is_active)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 text-gray-400 hover:text-red-500"
                      onClick={() => handleDeletePoll(poll.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
