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
export const OPENAQ_LOCATION_LIMIT = 5;
export const CPCB_BASE_URL = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69";
export const CPCB_RECORD_LIMIT = 200;
/** CPCB timestamps are local Indian Standard Time without an offset. */
export const IST_OFFSET = "+05:30";

// ---- Gemini --------------------------------------------------------------------
export const GEMINI_MODEL = "gemini-2.5-flash";
export const ADVICE_MAX_OUTPUT_TOKENS = 2_048;
export const CHAT_MAX_OUTPUT_TOKENS = 600;
export const AI_TEMPERATURE = 0.3; // low: we want faithful rephrasing, not creativity
export const AI_RETRIES = 1;

// ---- Gas unit conversion -------------------------------------------------------
/** Molar volume of an ideal gas at 25 °C, 1 atm (L/mol), used for ppm -> µg/m³. */
export const MOLAR_VOLUME_L = 24.45;
/** Molecular weights (g/mol). */
export const MOLECULAR_WEIGHT = { no2: 46.01, o3: 48.0, so2: 64.07, co: 28.01 } as const;

// ---- Commute modelling ---------------------------------------------------------
export const WORK_DAYS_PER_WEEK = 5;
export const WEEKS_PER_YEAR = 52;
export const TRIPS_PER_DAY = 2; // to work and back

/**
 * Per-passenger-km CO2 (kg). Approximations derived from India GHG Program,
 * "India Specific Road Transport Emission Factors" (2015), divided by typical occupancy;
 * metro from grid-electric energy intensity of Indian metro systems (order of DMRC reports).
 */
export const CO2_KG_PER_PKM = {
  walk: 0,
  cycle: 0,
  metro: 0.01,
  bus: 0.015,
  two_wheeler: 0.035,
  auto: 0.055,
  car: 0.13,
} as const;

/** Typical door-to-door urban speeds (km/h) used to convert distance to time exposed. */
export const SPEED_KMH = { walk: 5, cycle: 14, metro: 30, bus: 16, two_wheeler: 25, auto: 20, car: 22 } as const;

/**
 * In-transit PM2.5 concentration relative to ambient. Approximate ratios informed by
 * Goel et al. (2015), "On-road PM2.5 exposure in multiple transport microenvironments
 * in Delhi", Atmospheric Environment 123:129-138 (metro lowest; auto/open modes highest).
 */
export const MODE_EXPOSURE_RATIO = { walk: 1.2, cycle: 1.2, metro: 0.6, bus: 1.2, two_wheeler: 1.4, auto: 1.5, car: 0.9 } as const;

/** Inhalation rates (m³/h). US EPA Exposure Factors Handbook (2011), ch. 6. */
export const INHALATION_M3H = { rest: 0.5, light: 1.0, moderate: 1.6 } as const;
export const MODE_ACTIVITY = { walk: "light", cycle: "moderate", metro: "rest", bus: "rest", two_wheeler: "rest", auto: "rest", car: "rest" } as const;

/** Car occupancy assumed when carpooling. */
export const CARPOOL_OCCUPANCY = 2;

// ---- Diurnal pattern & indoor air ---------------------------------------------
/**
 * Typical north-Indian winter PM2.5 diurnal shape relative to the daily mean: night and
 * early-morning inversions trap smoke; afternoon boundary-layer mixing dilutes it
 * (pattern seen in CPCB continuous-monitor and IITM SAFAR winter observations).
 */
export const DIURNAL_FACTOR = { morningPeak: 1.25, afternoon: 0.75 } as const;
export const CLEANEST_WINDOW = { startHour: 13, endHour: 17 } as const;
export const MORNING_PEAK = { startHour: 7, endHour: 10 } as const;

/** Single-zone mass balance inputs (Nazaroff 2004; Riley et al. 2002). */
export const ROOM_VOLUME_M3 = 36; // 12 m² bedroom, 3 m ceiling
export const INFILTRATION_ACH = 1.5; // leaky urban Indian home, windows shut
export const PM25_DEPOSITION_PER_H = 0.2;
/** Mid-range commercial HEPA purifier clean air delivery rate. */
export const HEPA_CADR_M3H = 250;
/** Box fan + MERV-13 filter ("Corsi-Rosenthal" style); measured CADRs are commonly higher. */
export const DIY_CADR_M3H = 400;
export const DIY_PURIFIER_COST_INR = 3_000;

/** Typical capture efficiency of kitchen exhaust hoods (Singer et al. 2012, Indoor Air). */
export const RANGE_HOOD_CAPTURE = 0.5;
/** N95 minimum filtration at 0.3 µm (NIOSH 42 CFR 84). */
export const N95_FILTRATION = 0.95;
/** One mosquito coil emits PM2.5 comparable to 75-137 cigarettes (Liu et al. 2003, EHP). */
export const MOSQUITO_COIL_CIGARETTES = { low: 75, high: 137 } as const;
/** PM2.5 emission factor for open burning of crop/garden residue, g/kg (Akagi et al. 2011). */
export const OPEN_BURNING_PM25_G_PER_KG = 6.3;
export const LEAF_PILE_KG = 10;

// ---- AQI policy thresholds -----------------------------------------------------
/** NAQI index at/above which "Poor" begins: masks and indoor exercise are recommended. */
export const AQI_POOR = 201;
export const AQI_VERY_POOR = 301;

/** Largest accepted JSON request body. Profiles are tiny; this blocks payload abuse. */
export const MAX_BODY_CHARS = 16_384;
