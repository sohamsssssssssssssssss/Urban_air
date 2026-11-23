import type { AqSource } from "../aq/types";
import type { ROUTE_MODES } from "./constants";

export type RouteMode = (typeof ROUTE_MODES)[number];
export type RouteLabel = "cleanest" | "fastest" | "balance";
export const ROUTE_LABELS: readonly RouteLabel[] = ["cleanest", "fastest", "balance"];

export interface Place {
  lat: number;
  lon: number;
  label: string;
}

/** One OSRM route reduced to what scoring needs. */
export interface RawRoute {
  distanceM: number;
  durationS: number;
  /** Share (0..1) of the distance on steps OSRM marks as a numbered/major road. */
  majorShare: number;
}

/** Ambient PM2.5 used for scoring, with how it was obtained. */
export interface Ambient {
  /** Mean PM2.5 (µg/m³) per IST hour of day, from the station's last 24 h. */
  byHour?: Map<number, number>;
  /** Single PM2.5 value used when no hourly profile exists. */
  flat?: number;
  /** hourly-profile: time-of-day aware. latest: one reading. sub-index: inverted from a published CPCB sub-index. */
  basis: "hourly-profile" | "latest" | "sub-index";
  /** True when no monitor within 25 km, the city-level reading was used, or the value was inferred from a sub-index. */
  approximate: boolean;
  station: string;
  source: AqSource;
  measuredAt: string;
}

/** An estimated (never measured) route outcome. */
export interface ScoredRoute {
  id: string;
  mode: RouteMode;
  /** 1-based alternative number as returned by OSRM. */
  alt: number;
  distanceKm: number;
  durationMin: number;
  /** Estimated PM2.5 inhaled over the trip, µg. */
  pm25Ug: number;
  co2Kg: number;
  /** Mean ambient PM2.5 over the trip, µg/m³. */
  ambientUgm3: number;
  majorShare: number;
  roadAdjustment: "applied" | "not-applied";
}

export interface RouteCard {
  route: ScoredRoute;
  labels: RouteLabel[];
  reason: string;
}
