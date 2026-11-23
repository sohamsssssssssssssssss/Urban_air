import { ungroundedNumbers } from "./grounding";

/** A computed sentence Gemini may reword, plus what the reworded version must still say. */
export interface RephraseTarget {
  /** The computed sentence (also the fallback). */
  line: string;
  /** Each group is "any of these words must appear" (case-insensitive), e.g. both window times, or "mask". */
  mustMention: string[][];
}

const MAX_CHARS = 240;

/**
 * Accepts a reworded sentence only when it is one short line, introduces no number that is not in the
 * grounded context, and still mentions every required decision. Otherwise returns undefined and the
 * computed sentence is used.
 * @param candidate - Gemini's wording
 * @param target - what must be preserved
 * @param context - the grounded context (must contain the computed line)
 */
export function acceptRephrase(candidate: string | undefined, target: RephraseTarget, context: string): string | undefined {
  const line = candidate?.replace(/\s+/g, " ").trim();
  if (!line || line.length > MAX_CHARS) return undefined;
  if (ungroundedNumbers(line, context).length > 0) return undefined;
  const lower = line.toLowerCase();
  return target.mustMention.every((group) => group.some((word) => lower.includes(word.toLowerCase()))) ? line : undefined;
}
