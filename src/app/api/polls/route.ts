import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { getPublicPolls, getPollResults, submitVote } from "@/features/polls/queries";
import { rateLimit } from "@/lib/rate-limit";

const voteSchema = z.object({
  pollId: z.string().uuid(),
  optionId: z.string().uuid(),
});

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Anonymous votes are keyed by a server-derived HMAC of (poll, IP) so the
 * client cannot rotate identities to stuff votes. One vote per IP per poll.
 */
function deriveAnonymousVoterId(request: NextRequest, pollId: string): string {
  const ip = getClientIp(request);
  const secret =
    process.env.PIN_UNLOCK_SECRET ||
    process.env.ENCRYPTION_SECRET ||
    "poll-anonymous-voter-salt";
  return createHmac("sha256", secret).update(`${pollId}:${ip}`).digest("hex").slice(0, 32);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pollId = searchParams.get("pollId");

  if (pollId) {
    const parsedId = z.string().uuid().safeParse(pollId);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid pollId" }, { status: 400 });
    }
    const results = await getPollResults(parsedId.data);
    if (!results) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }
    return NextResponse.json(results);
  }

  const polls = await getPublicPolls();
  return NextResponse.json(polls);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "pollId and optionId must be valid UUIDs" }, { status: 400 });
  }

  const rl = await rateLimit(`poll-vote:${getClientIp(request)}`, { windowMs: 60_000, max: 5 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const anonymousId = deriveAnonymousVoterId(request, parsed.data.pollId);
  const result = await submitVote(parsed.data.pollId, parsed.data.optionId, anonymousId);

  if (result.success) {
    return NextResponse.json(result);
  } else {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
}
