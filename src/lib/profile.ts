import { z } from "zod";
import { CITY_NAMES } from "./cities";
import { COMMUTE_MODES } from "./commute";
import { COMMUTE_MAX_KM } from "./constants";

export { COMMUTE_MODES, MODE_LABEL, type CommuteMode } from "./commute";

const hour = z.number().int().min(0).max(23);

/** Household and lifestyle inputs used to personalise advice. Contains no free text. */
export const ProfileSchema = z
  .object({
    kids: z.boolean(),
    elderly: z.boolean(),
    respiratory: z.boolean(),
    pets: z.boolean(),
    commuteMode: z.enum(COMMUTE_MODES),
    commuteKm: z.number().min(0).max(COMMUTE_MAX_KM),
    workStartHour: hour,
    workEndHour: hour,
    ownsPurifier: z.boolean(),
    budget: z.enum(["low", "medium", "high"]),
  })
  .strict();
export type UserProfile = z.infer<typeof ProfileSchema>;

export const LocationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    city: z.enum(CITY_NAMES).optional(),
  })
  .strict();
export type Location = z.infer<typeof LocationSchema>;

export const LanguageSchema = z.enum(["en", "hi"]);
export type Language = z.infer<typeof LanguageSchema>;
