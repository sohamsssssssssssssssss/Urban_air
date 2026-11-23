import { z } from "zod";
import { getOutlook } from "@/features/outlook/server";
import { handle, parseInput } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const QuerySchema = z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) }).strict();

/** GET /api/outlook?lat=&lon= : 48 h model forecast (CAMS via Open-Meteo) and the three cleanest windows. */
export async function GET(req: Request): Promise<Response> {
  return handle(req, async () => {
    const params = new URL(req.url).searchParams;
    const { lat, lon } = parseInput(QuerySchema, { lat: params.get("lat") ?? undefined, lon: params.get("lon") ?? undefined, ...Object.fromEntries([...params].filter(([k]) => k !== "lat" && k !== "lon")) });
    return Response.json({ outlook: await getOutlook(lat, lon) }, { headers: { "Cache-Control": "private, max-age=300" } });
  });
}
