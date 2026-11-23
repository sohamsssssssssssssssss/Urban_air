import { z } from "zod";

export const PRIORITIES = ["high", "medium", "low"] as const;
export const SECTIONS = ["routines", "indoor", "alternatives"] as const;
export type Section = (typeof SECTIONS)[number];

/** One recommendation. `impact` is always produced by deterministic code, never by the model. */
export const AdviceItemSchema = z.object({
  action: z.string().min(1).max(300),
  why: z.string().min(1).max(500),
  impact: z.string().min(1).max(300),
  personalizedFor: z.string().max(200),
  priority: z.enum(PRIORITIES),
});
export type AdviceItem = z.infer<typeof AdviceItemSchema>;

export const AdviceSchema = z.object({
  summary: z.string().min(1).max(800),
  bestOutdoorWindow: z.string().min(1).max(200),
  routines: z.array(AdviceItemSchema),
  indoor: z.array(AdviceItemSchema),
  alternatives: z.array(AdviceItemSchema),
});
export type Advice = z.infer<typeof AdviceSchema>;

/** A pre-computed, fully grounded recommendation the model may rephrase and prioritise. */
export interface Fact extends AdviceItem {
  id: string;
  section: Section;
}

/**
 * What Gemini returns: each item references a pre-computed fact by id. The model's `impact`
 * is only used as a translation and only if its numbers match the fact's (see advisor.ts).
 */
const ModelItemSchema = AdviceItemSchema.extend({ factId: z.string().max(40) });
export const ModelAdviceSchema = z.object({
  summary: z.string().min(1).max(800),
  routines: z.array(ModelItemSchema).max(8),
  indoor: z.array(ModelItemSchema).max(8),
  alternatives: z.array(ModelItemSchema).max(8),
  /** Optional reworded "Today in one line" sentence (accepted only after `acceptRephrase` checks). */
  todayLine: z.string().max(240).optional(),
});
export type ModelAdvice = z.infer<typeof ModelAdviceSchema>;

/** JSON Schema handed to Gemini's structured-output mode. */
export const modelAdviceJsonSchema: Record<string, unknown> = Object.fromEntries(
  Object.entries(z.toJSONSchema(ModelAdviceSchema)).filter(([key]) => key !== "$schema"),
);
