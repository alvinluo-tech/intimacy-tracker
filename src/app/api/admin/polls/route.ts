import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/features/admin/queries';
import { createPoll, updatePoll, deletePoll, getAllPolls } from '@/features/polls/queries';

const createPollSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  poll_type: z.string().max(50).optional(),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional().nullable(),
});

const updatePollSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  poll_type: z.string().max(50).optional(),
  is_active: z.boolean().optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional().nullable(),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const polls = await getAllPolls();
  return NextResponse.json(polls);
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createPollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid poll payload', issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  const input = {
    title: parsed.data.title,
    description: parsed.data.description ?? undefined,
    poll_type: (parsed.data.poll_type === 'multiple' ? 'multiple' : 'single') as 'single' | 'multiple',
    options: parsed.data.options,
    starts_at: parsed.data.starts_at ? new Date(parsed.data.starts_at) : undefined,
    ends_at: parsed.data.ends_at ? new Date(parsed.data.ends_at) : undefined,
  };
  const result = await createPoll(input);

  if (result.success) {
    return NextResponse.json(result);
  } else {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = updatePollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid poll payload', issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  const input = {
    id: parsed.data.id,
    title: parsed.data.title,
    description: parsed.data.description ?? undefined,
    poll_type: parsed.data.poll_type
      ? ((parsed.data.poll_type === 'multiple' ? 'multiple' : 'single') as 'single' | 'multiple')
      : undefined,
    is_active: parsed.data.is_active,
    starts_at: parsed.data.starts_at ? new Date(parsed.data.starts_at) : undefined,
    ends_at: parsed.data.ends_at ? new Date(parsed.data.ends_at) : undefined,
  };
  const result = await updatePoll(input);

  if (result.success) {
    return NextResponse.json(result);
  } else {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const pollId = searchParams.get('id');

  if (!pollId || !z.string().uuid().safeParse(pollId).success) {
    return NextResponse.json({ error: 'A valid Poll ID is required' }, { status: 400 });
  }

  const result = await deletePoll(pollId);

  if (result.success) {
    return NextResponse.json(result);
  } else {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
}
