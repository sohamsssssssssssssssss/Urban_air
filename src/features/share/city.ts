import { CITIES, type CityName } from "@/lib/cities";

// Own file: Toolbox (first-load) needs this, and share/logic.ts pulls in Zod through the tracker.
/** The listed city with this name, or the first city. */
export const cityOrDefault = (city: string | undefined): CityName => CITIES.find((c) => c.name === city)?.name ?? CITIES[0].name;
