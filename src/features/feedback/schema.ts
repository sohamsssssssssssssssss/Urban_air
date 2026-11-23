import { z } from "zod";
import { FACT_IDS } from "@/lib/impact/factIds";
import { VOTES } from "./constants";

/** POST /api/feedback body: which tip, and the vote. Nothing else is accepted. */
export const FeedbackSchema = z.object({ tipId: z.enum(FACT_IDS), vote: z.enum(VOTES) }).strict();
export type Feedback = z.infer<typeof FeedbackSchema>;
