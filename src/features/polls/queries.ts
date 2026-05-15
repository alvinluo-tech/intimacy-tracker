import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getServerUser } from '@/features/auth/queries';
import type { Poll, PollOption, PollResults, PollWithOptions, CreatePollInput, UpdatePollInput } from './types';

// Get all active public polls
export async function getPublicPolls(): Promise<PollWithOptions[]> {
  const supabase = createSupabaseAdminClient();

  const { data: polls, error } = await supabase
    .from('polls')
    .select('*')
    .eq('is_active', true)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[polls] Error fetching public polls:', error);
    return [];
  }

  // Fetch options for each poll
  const pollsWithOptions = await Promise.all(
    polls.map(async (poll) => {
      const { data: options } = await supabase
        .from('poll_options')
        .select('*')
        .eq('poll_id', poll.id)
        .order('option_order', { ascending: true });

      return {
        ...poll,
        options: options || [],
      };
    })
  );

  return pollsWithOptions;
}

// Get poll results
export async function getPollResults(pollId: string): Promise<PollResults | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc('get_poll_results', {
    p_poll_id: pollId,
  });

  if (error) {
    console.error('[polls] Error fetching poll results:', error);
    return null;
  }

  return data as PollResults;
}

// Check if current user has voted on a poll
export async function hasUserVoted(pollId: string): Promise<boolean> {
  const user = await getServerUser();
  const supabase = createSupabaseAdminClient();

  // Get anonymous ID from cookies (if available)
  const anonymousId = null; // Will be handled client-side

  const { data, error } = await supabase.rpc('has_user_voted', {
    p_poll_id: pollId,
    p_user_id: user?.id || null,
    p_anonymous_id: anonymousId,
  });

  if (error) {
    console.error('[polls] Error checking vote status:', error);
    return false;
  }

  return data as boolean;
}

// Submit a vote
export async function submitVote(
  pollId: string,
  optionId: string,
  anonymousId?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser();
  const supabase = createSupabaseAdminClient();

  // Check if already voted
  const alreadyVoted = await hasUserVoted(pollId);
  if (alreadyVoted) {
    return { success: false, error: 'You have already voted on this poll' };
  }

  const { error } = await supabase.from('poll_votes').insert({
    poll_id: pollId,
    option_id: optionId,
    user_id: user?.id || null,
    anonymous_id: user ? null : anonymousId,
  });

  if (error) {
    console.error('[polls] Error submitting vote:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Admin: Get all polls (including inactive)
export async function getAllPolls(): Promise<PollResults[]> {
  const supabase = createSupabaseAdminClient();

  const { data: polls, error } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[polls] Error fetching all polls:', error);
    return [];
  }

  const pollsWithResults = await Promise.all(
    polls.map(async (poll) => {
      const { data: options } = await supabase
        .from('poll_options')
        .select('*')
        .eq('poll_id', poll.id)
        .order('option_order', { ascending: true });

      // Get vote counts for each option
      const optionsWithVotes = await Promise.all(
        (options || []).map(async (option) => {
          const { count } = await supabase
            .from('poll_votes')
            .select('*', { count: 'exact', head: true })
            .eq('option_id', option.id);

          return {
            ...option,
            vote_count: count || 0,
          };
        })
      );

      // Get total votes for the poll
      const { count: totalVotes } = await supabase
        .from('poll_votes')
        .select('*', { count: 'exact', head: true })
        .eq('poll_id', poll.id);

      return {
        poll: {
          ...poll,
          total_votes: totalVotes || 0,
        },
        options: optionsWithVotes,
      };
    })
  );

  return pollsWithResults;
}

// Admin: Create a poll
export async function createPoll(input: CreatePollInput): Promise<{ success: boolean; pollId?: string; error?: string }> {
  const user = await getServerUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const supabase = createSupabaseAdminClient();

  // Create the poll
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      title: input.title,
      description: input.description,
      poll_type: input.poll_type,
      created_by: user.id,
      starts_at: input.starts_at?.toISOString() || new Date().toISOString(),
      ends_at: input.ends_at?.toISOString() || null,
    })
    .select()
    .single();

  if (pollError) {
    console.error('[polls] Error creating poll:', pollError);
    return { success: false, error: pollError.message };
  }

  // Create options
  const optionsToInsert = input.options.map((text, index) => ({
    poll_id: poll.id,
    option_text: text,
    option_order: index,
  }));

  const { error: optionsError } = await supabase
    .from('poll_options')
    .insert(optionsToInsert);

  if (optionsError) {
    console.error('[polls] Error creating poll options:', optionsError);
    // Clean up the poll
    await supabase.from('polls').delete().eq('id', poll.id);
    return { success: false, error: optionsError.message };
  }

  return { success: true, pollId: poll.id };
}

// Admin: Update a poll
export async function updatePoll(input: UpdatePollInput): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseAdminClient();

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.poll_type !== undefined) updateData.poll_type = input.poll_type;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;
  if (input.starts_at !== undefined) updateData.starts_at = input.starts_at?.toISOString();
  if (input.ends_at !== undefined) updateData.ends_at = input.ends_at?.toISOString();

  const { error } = await supabase
    .from('polls')
    .update(updateData)
    .eq('id', input.id);

  if (error) {
    console.error('[polls] Error updating poll:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Admin: Delete a poll
export async function deletePoll(pollId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from('polls')
    .delete()
    .eq('id', pollId);

  if (error) {
    console.error('[polls] Error deleting poll:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Admin: Get platform statistics
export async function getPlatformStats(): Promise<Record<string, unknown> | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc('get_platform_stats');

  if (error) {
    console.error('[admin] Error fetching platform stats:', error);
    return null;
  }

  return data as Record<string, unknown>;
}
