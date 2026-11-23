import { z } from "../shared/zod";
import { CITY_NAMES } from "@/lib/cities";
import { ROUTE_PLACE_MAX_CHARS } from "@/lib/route/constants";
import { LanguageSchema } from "@/lib/profile";

const Query = z.object({ query: z.string().trim().min(2).max(ROUTE_PLACE_MAX_CHARS) }).strict();
const Coordinates = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180), city: z.enum(CITY_NAMES).optional() }).strict();

/** A place is a listed city / coordinates, or free text that Nominatim geocodes. */
export const ComparePlaceSchema = z.union([Query, Coordinates]);
export type ComparePlace = z.infer<typeof ComparePlaceSchema>;

/** POST /api/compare body. */
export const CompareRequestSchema = z.object({ a: ComparePlaceSchema, b: ComparePlaceSchema, language: LanguageSchema }).strict();
export type CompareRequest = z.infer<typeof CompareRequestSchema>;

/** What the form remembers on this device: each side is a listed city or free text. */
const Choice = z.union([z.object({ kind: z.literal("city"), city: z.enum(CITY_NAMES) }), z.object({ kind: z.literal("text"), query: z.string().max(ROUTE_PLACE_MAX_CHARS) })]);
export const StoredChoicesSchema = z.object({ a: Choice, b: Choice });
export type PlaceChoice = z.infer<typeof Choice>;
export type StoredChoices = z.infer<typeof StoredChoicesSchema>;
