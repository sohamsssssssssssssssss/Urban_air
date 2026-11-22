import { getAirQuality } from "@/lib/aq";
import { handle, parseInput } from "@/lib/http";
import { LocationSchema } from "@/lib/profile";

export const dynamic = "force-dynamic";

/** GET /api/air?lat=&lon=&city= : live AQ snapshot for a location. */
export async function GET(req: Request): Promise<Response> {
  return handle(req, async () => {
    const params = new URL(req.url).searchParams;
    const num = (key: string) => (params.has(key) ? Number(params.get(key)) : undefined);
    const location = parseInput(LocationSchema, { lat: num("lat"), lon: num("lon"), city: params.get("city") ?? undefined });
    const snapshot = await getAirQuality(location);
    return Response.json({ snapshot }, { headers: { "Cache-Control": "no-store" } });
  });
}
