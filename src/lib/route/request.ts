import { z } from "zod";
import { LanguageSchema } from "../profile";
import { ROUTE_PLACE_MAX_CHARS } from "./constants";

const Coordinates = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }).strict();
const Query = z.object({ query: z.string().trim().min(2).max(ROUTE_PLACE_MAX_CHARS) }).strict();
/** A place is either free text (geocoded by Nominatim) or exact coordinates. */
export const PlaceInputSchema = z.union([Query, Coordinates]);
export type PlaceInput = z.infer<typeof PlaceInputSchema>;

/** POST /api/route body. `departAt` (ISO) defaults to now. */
export const RouteRequestSchema = z
  .object({ origin: PlaceInputSchema, destination: PlaceInputSchema, language: LanguageSchema, departAt: z.string().datetime({ offset: true }).optional() })
  .strict();
export type RouteRequest = z.infer<typeof RouteRequestSchema>;
