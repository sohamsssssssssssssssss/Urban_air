import { z } from "zod";
import { COMMUTE_MODES } from "@/lib/commute";
import { COMMUTE_MAX_KM } from "@/lib/constants";
import { MAX_TRIPS } from "./constants";

/** One logged trip. `ambientUgm3` is the PM2.5 at the time (null when unknown), used for the exposure estimate. */
export const TripSchema = z
  .object({
    id: z.string().min(1).max(60),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mode: z.enum(COMMUTE_MODES),
    km: z.number().min(0.1).max(COMMUTE_MAX_KM),
    source: z.enum(["manual", "route"]),
    ambientUgm3: z.number().min(0).max(1000).nullable(),
  })
  .strict();
export type Trip = z.infer<typeof TripSchema>;

/** Everything the tracker saves on this device. */
export const TrackerStateSchema = z.object({ baseline: z.enum(COMMUTE_MODES), trips: z.array(TripSchema).max(MAX_TRIPS) }).strict();
export type TrackerState = z.infer<typeof TrackerStateSchema>;

/** Prefill handed over from the route planner ("Log this trip"). */
export interface TripDraft {
  mode: Trip["mode"];
  km: number;
  ambientUgm3: number | null;
}
