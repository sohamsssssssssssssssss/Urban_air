import { CardQuerySchema } from "@/features/share/schema";
import { renderCard } from "@/features/share/server";
import { handle, parseInput } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/** GET /api/card?kind=today&city=&lang= or ?kind=weekly&... : a shareable PNG. Strict query, rate-limited, no personal data. */
export async function GET(req: Request): Promise<Response> {
  return handle(req, async () => renderCard(parseInput(CardQuerySchema, Object.fromEntries(new URL(req.url).searchParams))));
}
