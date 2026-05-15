import { NextRequest, NextResponse } from 'next/server';
import { getPublicPolls, getPollResults, submitVote } from '@/features/polls/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pollId = searchParams.get('pollId');

  if (pollId) {
    const results = await getPollResults(pollId);
    if (!results) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }
    return NextResponse.json(results);
  }

  const polls = await getPublicPolls();
  return NextResponse.json(polls);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { pollId, optionId, anonymousId } = body;

  if (!pollId || !optionId) {
    return NextResponse.json({ error: 'pollId and optionId are required' }, { status: 400 });
  }

  const result = await submitVote(pollId, optionId, anonymousId);

  if (result.success) {
    return NextResponse.json(result);
  } else {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
}
