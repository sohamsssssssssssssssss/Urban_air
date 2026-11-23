import { z } from "zod";
import { CITY_NAMES } from "@/lib/cities";
import { LanguageSchema } from "@/lib/profile";
import { CARD_PERIODS, WEEKLY_BOUNDS } from "./constants";

/** A decimal number from a query string. Unlike `z.coerce.number()`, an empty or non-numeric value is rejected, not turned into 0. */
const num = (min: number, max: number) =>
  z.string().regex(/^-?\d{1,9}(\.\d{1,3})?$/).transform(Number).pipe(z.number().min(min).max(max));

const Today = z.object({ kind: z.literal("today"), city: z.enum(CITY_NAMES), lang: LanguageSchema }).strict();
const Weekly = z
  .object({
    kind: z.literal("weekly"),
    lang: LanguageSchema,
    period: z.enum(CARD_PERIODS),
    trips: z.string().regex(/^\d{1,4}$/).transform(Number).pipe(z.number().int().max(WEEKLY_BOUNDS.trips)),
    km: num(0, WEEKLY_BOUNDS.km),
    co2: num(-WEEKLY_BOUNDS.co2, WEEKLY_BOUNDS.co2),
    pm25: num(-WEEKLY_BOUNDS.pm25, WEEKLY_BOUNDS.pm25),
  })
  .strict();

/** GET /api/card query. "today" is recomputed on the server from the live reading; "weekly" is self-reported and bounded. */
export const CardQuerySchema = z.discriminatedUnion("kind", [Today, Weekly]);
export type CardQuery = z.infer<typeof CardQuerySchema>;
