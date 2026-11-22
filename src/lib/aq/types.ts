export const POLLUTANTS = ["pm25", "pm10", "no2", "o3", "so2", "co", "nh3"] as const;
export type Pollutant = (typeof POLLUTANTS)[number];

/** Pollutant concentrations, all normalised to µg/m³. */
export type Concentrations = Partial<Record<Pollutant, number>>;

/** NAQI sub-index per pollutant (0-500). */
export type SubIndices = Partial<Record<Pollutant, number>>;

/** One hourly PM2.5 average (µg/m³) from the station's recent history. */
export interface HourlyPoint {
  /** ISO start of the hour. */
  at: string;
  pm25: number;
}

export const CATEGORIES = ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"] as const;
export type AqiCategory = (typeof CATEGORIES)[number];

export type AqSource = "OpenAQ" | "CPCB";

/** One station's latest reading, as returned by a source adapter. */
export interface StationReading {
  source: AqSource;
  station: { id: string; name: string; distanceM?: number };
  /** Latest hourly concentrations, when available for this station. */
  pollutants: Concentrations;
  pm25MeasuredAt?: string;
  /** Published CPCB sub-indices or OpenAQ sub-indices calculated using hourly history. */
  subIndices?: SubIndices;
  provisional?: boolean;
  /** Last ~24 h of hourly PM2.5 (OpenAQ only), used for data-driven timing advice. */
  history?: HourlyPoint[];
  /** ISO timestamp of the measurement. */
  measuredAt: string;
}

/** Normalised, source-agnostic snapshot that the UI and AI are grounded on. */
export interface AQSnapshot extends StationReading {
  subIndices: SubIndices;
  provisional: boolean;
  aqi: number;
  category: AqiCategory;
  dominant: Pollutant;
  /** ISO timestamp of when SmogSense fetched it. */
  fetchedAt: string;
  /** True when the measurement is older than STALE_AFTER_MS. */
  stale: boolean;
}

export interface GeoQuery {
  lat: number;
  lon: number;
  /** City name used for the CPCB fallback (filters by city). */
  city?: string;
}
