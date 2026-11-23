import { z } from "@/features/shared/zod"; // must come first: turns Zod's eval probe off before any schema is built
import { LanguageSchema, LocationSchema, ProfileSchema } from "@/lib/profile";
import type { Language, Location, UserProfile } from "@/lib/profile";

export const SETUP_STORAGE_KEY = "setup";

/** The household the user told us about, saved on this device only. */
export interface Setup {
  location: Location;
  profile: UserProfile;
  language: Language;
}

const SetupSchema = z.object({ location: LocationSchema, profile: ProfileSchema, language: LanguageSchema }).strict();

/** Validates a saved setup. Returns null for anything missing or malformed. Loaded lazily, only for returning visitors. */
export function parseSetup(raw: unknown): Setup | null {
  const parsed = SetupSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
