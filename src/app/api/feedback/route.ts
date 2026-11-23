import { FeedbackSchema } from "@/features/feedback/schema";
import { recordFeedback } from "@/features/feedback/server";
import { handle, parseBody } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/feedback : one anonymous helpful / not-useful vote for a tip. Rate-limited, strict, no PII. */
export async function POST(req: Request): Promise<Response> {
  return handle(req, async () => {
    recordFeedback(await parseBody(req, FeedbackSchema));
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  });
}
