import { streamChat } from "@/lib/ai/chat";
import { getAirQuality } from "@/lib/aq";
import { handle, hasMetro, parseBody } from "@/lib/http";
import { ChatRequestSchema } from "@/lib/requests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/chat : streamed plain-text follow-up answer grounded on the same live snapshot. */
export async function POST(req: Request): Promise<Response> {
  return handle(req, async () => {
    const { location, ...rest } = await parseBody(req, ChatRequestSchema);
    const snapshot = await getAirQuality(location);
    const stream = await streamChat({ ...rest, snapshot, hasMetro: hasMetro(location) });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  });
}
