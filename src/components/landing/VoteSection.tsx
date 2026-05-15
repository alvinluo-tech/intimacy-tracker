'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import type { PollWithOptions, PollResults } from '@/features/polls/types';

export function VoteSection() {
  const t = useTranslations('landing');
  const [polls, setPolls] = useState<PollWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());
  const [pollResults, setPollResults] = useState<Record<string, PollResults>>({});

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async () => {
    try {
      const response = await fetch('/api/polls');
      if (response.ok) {
        const data = await response.json();
        setPolls(data);
      }
    } catch (error) {
      console.error('Error loading polls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId: string) => {
    const optionId = selectedOptions[pollId];
    if (!optionId) return;

    setVotingPollId(pollId);
    try {
      let anonymousId = localStorage.getItem('poll_anonymous_id');
      if (!anonymousId) {
        anonymousId = crypto.randomUUID();
        localStorage.setItem('poll_anonymous_id', anonymousId);
      }

      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, optionId, anonymousId }),
      });

      const result = await response.json();

      if (result.success) {
        setVotedPolls((prev) => new Set([...prev, pollId]));
        const resultsResponse = await fetch(`/api/polls?pollId=${pollId}`);
        if (resultsResponse.ok) {
          const results = await resultsResponse.json();
          setPollResults((prev) => ({ ...prev, [pollId]: results }));
        }
      } else {
        alert(result.error || 'Failed to submit vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to submit vote');
    } finally {
      setVotingPollId(null);
    }
  };

  const handleOptionSelect = (pollId: string, optionId: string) => {
    setSelectedOptions((prev) => ({ ...prev, [pollId]: optionId }));
  };

  const getPercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  if (loading) {
    return (
      <section className="py-16 px-6 bg-gray-50/50 dark:bg-white/[0.01]">
        <div className="max-w-5xl mx-auto text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-rose-500" />
        </div>
      </section>
    );
  }

  if (polls.length === 0) {
    return (
      <section id="vote" className="py-16 px-6 bg-gray-50/50 dark:bg-white/[0.01] border-y border-gray-200 dark:border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 dark:text-[#f8fafc] mb-3">
              {t('voteTitle')}
            </h2>
            <p className="text-gray-500 dark:text-[#94a3b8] max-w-2xl mx-auto">
              {t('voteDescription')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
              <Circle className="w-8 h-8 text-gray-300 dark:text-[#64748b]" />
            </div>
            <p className="text-gray-500 dark:text-[#94a3b8] text-sm">
              {t('noActivePolls')}
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="vote" className="py-16 px-6 bg-gray-50/50 dark:bg-white/[0.01] border-y border-gray-200 dark:border-white/[0.04]">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 dark:text-[#f8fafc] mb-3">
            {t('voteTitle')}
          </h2>
          <p className="text-gray-500 dark:text-[#94a3b8] max-w-2xl mx-auto">
            {t('voteDescription')}
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-6">
          {polls.map((poll, index) => {
            const isVoted = votedPolls.has(poll.id);
            const results = pollResults[poll.id];
            const totalVotes = results?.poll.total_votes || 0;

            return (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="w-full sm:w-[320px] bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] p-6 hover:border-gray-300 dark:hover:border-white/[0.1] transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#f8fafc] mb-2">
                  {poll.title}
                </h3>
                {poll.description && (
                  <p className="text-sm text-gray-500 dark:text-[#94a3b8] mb-4">
                    {poll.description}
                  </p>
                )}

                <div className="space-y-3 mb-4">
                  {poll.options.map((option) => {
                    const resultOption = results?.options.find((o) => o.id === option.id);
                    const votes = resultOption?.vote_count || 0;
                    const percentage = getPercentage(votes, totalVotes);
                    const isSelected = selectedOptions[poll.id] === option.id;

                    return (
                      <div key={option.id}>
                        {isVoted ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 dark:text-[#f8fafc]/80">
                                {option.option_text}
                              </span>
                              <span className="text-gray-500 dark:text-[#94a3b8] font-medium">
                                {percentage}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="h-full bg-rose-500 rounded-full"
                              />
                            </div>
                            <div className="text-xs text-gray-400 dark:text-[#64748b]">
                              {votes} {t('votes')}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOptionSelect(poll.id, option.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                              isSelected
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10'
                                : 'border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.1]'
                            }`}
                          >
                            {isSelected ? (
                              <CheckCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300 dark:text-[#64748b] flex-shrink-0" />
                            )}
                            <span className="text-sm text-gray-700 dark:text-[#f8fafc]/80">
                              {option.option_text}
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!isVoted && (
                  <button
                    onClick={() => handleVote(poll.id)}
                    disabled={!selectedOptions[poll.id] || votingPollId === poll.id}
                    className="w-full h-9 px-4 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 dark:disabled:bg-white/[0.1] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {votingPollId === poll.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t('submitVote')
                    )}
                  </button>
                )}

                {isVoted && (
                  <div className="text-center text-sm text-gray-500 dark:text-[#94a3b8]">
                    {t('totalVotes')}: {totalVotes}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
