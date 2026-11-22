export const POLLUTANTS = ["pm25", "pm10", "no2", "o3", "so2", "co"] as const;
export type Pollutant = (typeof POLLUTANTS)[number];

/** Pollutant concentrations, all normalised to µg/m³. */
export type Concentrations = Partial<Record<Pollutant, number>>;

export const CATEGORIES = ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"] as const;
export type AqiCategory = (typeof CATEGORIES)[number];

export type AqSource = "OpenAQ" | "CPCB";

/** One station's latest reading, as returned by a source adapter. */
export interface StationReading {
  source: AqSource;
  station: { id: string; name: string };
  pollutants: Concentrations;
  /** ISO timestamp of the measurement. */
  measuredAt: string;
}

/** Normalised, source-agnostic snapshot that the UI and AI are grounded on. */
export interface AQSnapshot extends StationReading {
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
