import { getAdvice } from "@/lib/ai/advisor";
import { getAirQuality } from "@/lib/aq";
import { handle, hasMetro, parseBody } from "@/lib/http";
import { AdviceRequestSchema } from "@/lib/requests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/** POST /api/advice : personalised advice grounded on the live snapshot (fetched server-side). */
export async function POST(req: Request): Promise<Response> {
  return handle(req, async () => {
    const { location, profile, language } = await parseBody(req, AdviceRequestSchema);
    const snapshot = await getAirQuality(location); // throws AQUnavailableError -> 503, LLM never called
    const result = await getAdvice(snapshot, profile, language, hasMetro(location));
    return Response.json({ snapshot, ...result }, { headers: { "Cache-Control": "no-store" } });
  });
}
