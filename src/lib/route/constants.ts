/** Constants for the route planner (v2). Each value is sourced or flagged as an assumption. */
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** Modes offered for routes. No transit: there is no real timetable source, so none is invented. */
export const ROUTE_MODES = ["walk", "cycle", "two_wheeler", "car"] as const;
/**
 * OSRM profiles on the FOSSGIS public servers (fair use; OSM data). OSRM has no motorcycle profile,
 * so two-wheelers use the car road network and car travel times (shown as such, never adjusted).
 */
export const OSRM_BASE_URL = {
  foot: "https://routing.openstreetmap.de/routed-foot",
  bike: "https://routing.openstreetmap.de/routed-bike",
  car: "https://routing.openstreetmap.de/routed-car",
} as const;
export const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
/** Nominatim usage policy: at most one request per second. */
export const NOMINATIM_MIN_INTERVAL_MS = 1_100;
export const GEOCODE_CACHE_TTL_MS = 24 * HOUR_MS;
export const ROUTE_CACHE_TTL_MS = 10 * MINUTE_MS;
export const ROUTE_PLACE_MAX_CHARS = 200;
/** Urban trips only: rejects cross-country requests before they reach OSRM. */
export const ROUTE_MAX_STRAIGHT_KM = 60;
/** A monitor farther than this from the origin is too far to represent the air on the route. */
export const NEAR_MONITOR_MAX_M = 25_000;
/** Departure may be at most this far in the past / future (the 24 h profile repeats daily). */
export const ROUTE_DEPART_PAST_MS = HOUR_MS;
export const ROUTE_DEPART_FUTURE_MS = 24 * HOUR_MS;
/** OSRM step classes / road refs that mark a main road. Public OSRM exposes few: see MAJOR_ROAD_FACTOR. */
export const MAJOR_ROAD_CLASSES = ["motorway", "toll"] as const;
/**
 * PM2.5 on a main road relative to a side street. SmogSense assumption, deliberately conservative:
 * Karner, Eisinger & Niemeier (2010), Environ. Sci. Technol. 44:5334-5344, report a weaker gradient
 * for PM2.5 (about 15% within 150 m of a roadway, as summarised in secondary sources; full text not
 * verified) than for black carbon or ultrafine particles; a Sydney roadside study (Atmosphere
 * 10(4):217, 2019) found the traffic increment on main streets about twice that on side streets.
 * Applied only to the share of the route OSRM identifies as a numbered/major road.
 */
export const MAJOR_ROAD_FACTOR = 1.15;
export const SIDE_ROAD_FACTOR = 1;
/** Gemini only rewords three one-line reasons, so it gets a short deadline (the route handler allows 30 s in total). */
export const ROUTE_AI_TIMEOUT_MS = 8_000;
/** Same place for origin and destination is rejected below this straight-line distance. */
export const ROUTE_MIN_STRAIGHT_KM = 0.1;
