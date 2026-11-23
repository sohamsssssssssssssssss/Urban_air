import { z } from "../shared/zod";
import { CITY_NAMES } from "@/lib/cities";
import { ALERT_THRESHOLDS } from "./constants";

/** What is saved per device. `lastNotified` stops the same alert repeating every 30 minutes. */
export const AlertSettingsSchema = z
  .object({
    enabled: z.boolean(),
    threshold: z.union(ALERT_THRESHOLDS.map((t) => z.literal(t)) as [z.ZodLiteral<101>, z.ZodLiteral<201>, z.ZodLiteral<301>, z.ZodLiteral<401>]),
    city: z.enum(CITY_NAMES),
    lastNotified: z.object({ at: z.number(), aqi: z.number() }).nullable(),
  })
  .strict();
export type AlertSettings = z.infer<typeof AlertSettingsSchema>;
