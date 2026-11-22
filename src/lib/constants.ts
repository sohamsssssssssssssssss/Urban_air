/**
 * Every tunable number in SmogSense lives here, each with its rationale or source.
 * Scientific factors are deliberately conservative approximations; they drive the
 * deterministic impact numbers shown to users (the LLM never invents them).
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

// ---- Caching, timeouts, limits -------------------------------------------------
/** Upstream stations publish hourly; 10 min keeps data fresh without hammering APIs. */
export const AQ_CACHE_TTL_MS = 10 * MINUTE_MS;
/** Advice only changes when the reading or profile changes. */
export const ADVICE_CACHE_TTL_MS = 15 * MINUTE_MS;
/** Bound memory use of each in-process cache. */
export const CACHE_MAX_ENTRIES = 500;
/** Per-upstream fetch timeout. */
export const FETCH_TIMEOUT_MS = 5_000;
/** Gemini call timeout (structured JSON generation takes longer than a data fetch). */
export const AI_TIMEOUT_MS = 20_000;
/** A reading older than this is flagged stale in the UI. */
export const STALE_AFTER_MS = 3 * HOUR_MS;
/** Older readings are rejected outright (many OpenAQ sites stopped reporting years ago). */
export const MAX_READING_AGE_MS = 24 * HOUR_MS;
/** Tolerance for upstream timestamps slightly in the future (clock skew); beyond it they are ignored. */
export const CLOCK_SKEW_MS = 15 * MINUTE_MS;
/** Lat/lon are rounded to 2 dp (~1.1 km) for cache keys: same station, better hit rate. */
export const COORD_CACHE_DECIMALS = 2;

// ---- Rate limiting (per IP token bucket) --------------------------------------
export const RATE_LIMIT_CAPACITY = 20;
export const RATE_LIMIT_REFILL_PER_SEC = 20 / 60; // 20 requests per minute sustained
export const RATE_LIMIT_MAX_KEYS = 10_000;

// ---- Input caps ----------------------------------------------------------------
export const CHAT_MAX_CHARS = 500;
export const CHAT_MAX_HISTORY = 6;
export const COMMUTE_MAX_KM = 100;

// ---- Upstream APIs -------------------------------------------------------------
export const OPENAQ_BASE_URL = "https://api.openaq.org/v3";
export const OPENAQ_RADIUS_M = 25_000; // OpenAQ v3 maximum search radius
/** OpenAQ returns locations unordered and does not support order_by=distance, so fetch all nearby. */
export const OPENAQ_LOCATION_LIMIT = 100;
/** Nearest fresh stations whose latest readings are fetched in parallel. */
export const OPENAQ_CANDIDATES = 3;
/** Hours of PM2.5 history used to find the station's cleanest and dirtiest windows. */
export const HISTORY_HOURS = 24;
export const CPCB_BASE_URL = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69";
/** Delhi alone returns ~400 records (56 stations × 7 pollutants). */
export const CPCB_RECORD_LIMIT = 1_000;
/** CPCB timestamps are local Indian Standard Time without an offset. */
export const IST_OFFSET = "+05:30";
export const IST_OFFSET_MINUTES = 330;

// ---- Gemini --------------------------------------------------------------------
export const GEMINI_MODEL = "gemini-2.5-flash";
/** JSON mode (responseMimeType + responseJsonSchema) is rejected on API v1; verified live. */
export const GEMINI_API_VERSION = "v1beta";
export const ADVICE_MAX_OUTPUT_TOKENS = 4_096; // Hindi output uses ~2-3x the tokens of English
export const CHAT_MAX_OUTPUT_TOKENS = 600;
export const AI_TEMPERATURE = 0.3; // low: we want faithful rephrasing, not creativity
export const AI_RETRIES = 1;

// ---- Gas unit conversion -------------------------------------------------------
/** Molar volume of an ideal gas at 25 °C, 1 atm (L/mol), used for ppm/ppb -> µg/m³. */
export const MOLAR_VOLUME_L = 24.45;
/** Molecular weights (g/mol). */
export const MOLECULAR_WEIGHT = { no2: 46.01, o3: 48.0, so2: 64.07, co: 28.01 } as const;
/**
 * Urban ambient CO is essentially never below ~100 µg/m³ (~0.1 ppm, global background).
 * Live OpenAQ data labels CO mg/m³ values as "µg/m³" and ppm values as "ppb"; anything
 * below this floor after conversion is a unit-label error, so it is dropped (never guessed).
 */
export const CO_MIN_PLAUSIBLE_UGM3 = 50;

// ---- Commute modelling ---------------------------------------------------------
export const WORK_DAYS_PER_WEEK = 5;
export const WEEKS_PER_YEAR = 52;
export const TRIPS_PER_DAY = 2; // to work and back

/**
 * Per-passenger-km CO2 (kg).
 * - bus: 0.015161 kg/pax-km, India GHG Program, "India Specific Road Transport Emission
 *   Factors" v1.0 (WRI India/CII/TERI, 2015), rounded.
 * - car, two_wheeler, auto: SmogSense approximations of that paper's per-vehicle-km factors
 *   (petrol car, two-wheeler, CNG auto) divided by occupancy 1, 1 and 2. Only the bus value is
 *   copied verbatim; these three are rounded estimates, not individually verified table values.
 * - metro: no absolute per-pax-km figure is published by DMRC (its 2023 TERI study reports
 *   only a 32.38 g/km *saving* vs road), so we conservatively use the bus factor. This
 *   understates metro savings rather than overstating them.
 */
export const CO2_KG_PER_PKM = {
  walk: 0,
  cycle: 0,
  metro: 0.015,
  bus: 0.015,
  two_wheeler: 0.035,
  auto: 0.055,
  car: 0.13,
} as const;

/** Door-to-door urban speeds (km/h). SmogSense assumption; converts distance to time exposed. */
export const SPEED_KMH = { walk: 5, cycle: 14, metro: 30, bus: 16, two_wheeler: 25, auto: 20, car: 22 } as const;

/**
 * In-transit PM2.5 relative to ambient. Goel et al. (2015), "On-road PM2.5 pollution exposure in
 * multiple transport microenvironments in Delhi", Atmospheric Environment 123:129-138, abstract:
 * on-road exceeded ambient by 40% walking, 10% cycle, 30% two-wheeler, 30% open-window car,
 * 30% auto, 20% bus; AC car and metro were lowest. The abstract gives no metro ratio, so we
 * conservatively use 0.8 (below ambient, as reported, but not as low as the paper suggests).
 */
export const MODE_EXPOSURE_RATIO = { walk: 1.4, cycle: 1.1, metro: 0.8, bus: 1.2, two_wheeler: 1.3, auto: 1.3, car: 1.3 } as const;

/**
 * Inhalation rates (m³/h) = US EPA Exposure Factors Handbook (2011), Table 6-2, adults 21 to <31,
 * mean m³/min × 60: sedentary 4.2E-03, light 1.2E-02, moderate 2.6E-02.
 */
export const INHALATION_M3H = { rest: 0.252, light: 0.72, moderate: 1.56 } as const;
export const MODE_ACTIVITY = { walk: "light", cycle: "moderate", metro: "rest", bus: "rest", two_wheeler: "rest", auto: "rest", car: "rest" } as const;

/** Car occupancy assumed when carpooling. */
export const CARPOOL_OCCUPANCY = 2;

// ---- Timing --------------------------------------------------------------------
/** Length of the outdoor-activity window searched in the station's 24 h history. */
export const WINDOW_HOURS = 3;
/** Only recommend windows within waking hours (IST). */
export const WAKING_HOURS = { start: 6, end: 22 } as const;
/** Minimum hourly points needed to trust the measured profile. */
export const MIN_HISTORY_POINTS = 12;
/**
 * Fallback when no hourly history exists (CPCB source): Delhi PM2.5 is lowest in the convective
 * afternoon hours when the mixing layer is deepest (Murthy et al. 2020, J. Atmos. Sol.-Terr. Phys.,
 * Lodhi Road ceilometer study). No percentage is claimed in this case.
 */
export const DEFAULT_CLEAN_WINDOW = { start: 13, end: 17 } as const;

// ---- Indoor air ----------------------------------------------------------------
/**
 * Single-zone mass balance (Nazaroff 2004, "Indoor particle dynamics", Indoor Air 14 S7:175-183;
 * Riley et al. 2002, Environ. Sci. Technol. 36:200-207). Room size and leakage are SmogSense
 * assumptions; a high infiltration rate is conservative (it lowers the computed purifier benefit).
 */
export const ROOM_VOLUME_M3 = 36; // 12 m² bedroom, 3 m ceiling
export const INFILTRATION_ACH = 1.5;
export const PM25_DEPOSITION_PER_H = 0.2; // within the 0.1-0.4 /h range reported by Riley et al. 2002
/** Recommended HEPA CADR; AHAM's "2/3 of floor area" rule (ANSI/AHAM AC-1) gives ≥146 m³/h for 12 m². */
export const HEPA_CADR_M3H = 250;
/**
 * Box fan + four MERV-13 filters: 165 CFM (≈280 m³/h), the low-speed estimate in UC Davis Western
 * Cooling Efficiency Center, "Case Study: DIY Portable Air Cleaners" (2021).
 */
export const DIY_CADR_M3H = 280;
export const DIY_PURIFIER_COST_INR = 3_000;

/**
 * Singer et al. (2012), "Performance of installed cooking exhaust devices", Indoor Air 22:224-234:
 * ≥95 L/s (200 cfm) was needed for >75% capture on front burners; back burners capture more.
 */
export const RANGE_HOOD_CAPTURE = 0.75;
export const RANGE_HOOD_FLOW_CFM = 200;
/** N95 minimum filtration at 0.3 µm (NIOSH, 42 CFR Part 84). */
export const N95_FILTRATION = 0.95;
/** One coil releases PM2.5 equal to 75-137 cigarettes (Liu et al. 2003, Environ. Health Perspect. 111:1454-1460). */
export const MOSQUITO_COIL_CIGARETTES = { low: 75, high: 137 } as const;
/** 100-1,000 plants per m² to match building ventilation (Cummings & Waring 2020, J. Expo. Sci. Environ. Epidemiol. 30:253-261). */
export const PLANTS_PER_M2 = { low: 100, high: 1_000 } as const;
/** PM2.5 emission factor for open burning of crop residue, 6.26 g/kg (Akagi et al. 2011, Atmos. Chem. Phys. 11:4039-4072). */
export const OPEN_BURNING_PM25_G_PER_KG = 6.26;
export const LEAF_PILE_KG = 10;

// ---- AQI policy thresholds (CPCB NAQI category boundaries) ----------------------
export const AQI_POOR = 201;
export const AQI_VERY_POOR = 301;
export const AQI_SEVERE = 401;

/** Largest accepted JSON request body. Profiles are tiny; this blocks payload abuse. */
export const MAX_BODY_CHARS = 16_384;
