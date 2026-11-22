import type { AQSnapshot } from "@/lib/aq/types";
import type { UserProfile } from "@/lib/profile";

export const NOW = Date.parse("2026-11-22T12:00:00Z");

export const snapshot: AQSnapshot = {
  source: "OpenAQ",
  station: { id: "openaq:8118", name: "Anand Vihar, Delhi" },
  pollutants: { pm25: 182, pm10: 310, no2: 64 },
  subIndices: { pm25: 374, pm10: 260, no2: 80 },
  measuredAt: "2026-11-22T11:00:00Z",
  aqi: 374,
  category: "Very Poor",
  dominant: "pm25",
  fetchedAt: "2026-11-22T12:00:00Z",
  stale: false,
  provisional: false,
};

export const profile: UserProfile = {
  kids: true,
  elderly: false,
  respiratory: false,
  pets: false,
  commuteMode: "car",
  commuteKm: 12,
  workStartHour: 9,
  workEndHour: 18,
  ownsPurifier: false,
  budget: "low",
};

export const location = { lat: 28.6469, lon: 77.3164, city: "Delhi" as const };

/** Builds a fetch mock that answers by URL substring. Unmatched URLs return 404. */
export function routeFetch(routes: Array<[string, unknown, number?]>) {
  return async (input: RequestInfo | URL) => {
    const url = String(input);
    const hit = routes.find(([part]) => url.includes(part));
    if (!hit) return new Response("not found", { status: 404 });
    const [, body, status = 200] = hit;
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  };
}

/** Real snapshot captured from OpenAQ (Talkatora Garden, Delhi) with 22 h of hourly PM2.5. */
export { default as liveSnapshot } from "./live/snapshot-delhi.json";
