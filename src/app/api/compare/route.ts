import { CompareRequestSchema } from "@/features/compare/schema";
import { compareAir } from "@/features/compare/server";
import { handle, parseBody } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/** POST /api/compare : live air quality at two places, each resolved independently. */
export async function POST(req: Request): Promise<Response> {
  return handle(req, async () => Response.json(await compareAir(await parseBody(req, CompareRequestSchema)), { headers: { "Cache-Control": "no-store" } }));
}
