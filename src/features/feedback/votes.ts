import { STORAGE_PREFIX } from "../shared/storage";
import { FEEDBACK_STORAGE_KEY, VOTES, type Vote } from "./constants";

/** Plain (Zod-free) so it can sit in the first-load bundle next to the advice tabs. */
const KEY = STORAGE_PREFIX + FEEDBACK_STORAGE_KEY;
const isVote = (v: unknown): v is Vote => (VOTES as readonly unknown[]).includes(v);

/** Votes saved on this device, by tip id. Corrupt or blocked storage reads as "no votes". */
export function readVotes(): Record<string, Vote> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => isVote(v))) as Record<string, Vote>;
  } catch {
    return {};
  }
}

/** Saves (or, with null, clears) one tip's vote, merging with what is already stored. */
export function saveVote(tipId: string, vote: Vote | null): void {
  try {
    const votes = readVotes();
    if (vote === null) delete votes[tipId];
    else votes[tipId] = vote;
    window.localStorage.setItem(KEY, JSON.stringify(votes));
  } catch {
    /* storage blocked: the vote still counts for this session */
  }
}
