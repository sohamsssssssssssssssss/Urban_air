import "server-only";
import type { Feedback } from "./schema";

/**
 * Records one anonymous vote as a single structured log line: the tip id and the vote, nothing else. No IP address,
 * user agent, profile, location or timestamp field is written by us (the platform adds its own log time).
 * Written to stdout so it is not mixed with warnings. This is a log, not a database: on Vercel Hobby, runtime logs are
 * retained only briefly, so it shows what people vote on today but is not a long-term analytics store.
 */
export function recordFeedback({ tipId, vote }: Feedback): void {
  process.stdout.write(`${JSON.stringify({ event: "tip_feedback", tipId, vote })}\n`);
}
