import { handle, parseBody } from "@/lib/http";
import { planRoutes } from "@/lib/route";
import { RouteRequestSchema } from "@/lib/route/request";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/** POST /api/route : routes between two places ranked by estimated PM2.5 inhaled, duration and balance. */
export async function POST(req: Request): Promise<Response> {
  return handle(req, async () => {
    const result = await planRoutes(await parseBody(req, RouteRequestSchema));
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  });
}
