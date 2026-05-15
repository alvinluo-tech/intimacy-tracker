export type Poll = {
  id: string;
  title: string;
  description: string | null;
  poll_type: 'single' | 'multiple';
  is_active: boolean;
  is_public: boolean;
  created_by: string | null;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PollOption = {
  id: string;
  poll_id: string;
  option_text: string;
  option_order: number;
  created_at: string;
};

export type PollVote = {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string | null;
  anonymous_id: string | null;
  created_at: string;
};

export type PollWithOptions = Poll & {
  options: PollOption[];
};

export type PollResults = {
  poll: Poll & {
    total_votes: number;
  };
  options: (PollOption & {
    vote_count: number;
  })[];
};

export type CreatePollInput = {
  title: string;
  description?: string;
  poll_type: 'single' | 'multiple';
  options: string[];
  starts_at?: Date;
  ends_at?: Date;
};

export type UpdatePollInput = Partial<CreatePollInput> & {
  id: string;
  is_active?: boolean;
};
