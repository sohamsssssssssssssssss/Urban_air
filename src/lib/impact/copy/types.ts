/** Who a recommendation especially protects. */
export type Audience = "kids" | "elderly" | "respiratory" | "pets";

/** Weekly / yearly kg CO2. */
export interface Kg {
  weeklyKg: number;
  yearlyKg: number;
}

/**
 * All user-facing fact text for one language. Every number is passed in from deterministic code,
 * so translations can never change a figure (a unit test checks EN and HI numbers match).
 */
export interface FactCopy {
  reading(d: { pollutant: string; value?: number; sub: number; aqi: number; category: string; station: string }): string;
  audience(who: Audience[]): string;
  timing: {
    action(best: string, worst?: string): string;
    why(reading: string): string;
    impactMeasured(d: { pct: number; best: string; bestAvg: number; worst: string; worstAvg: number }): string;
    impactDefault: string;
  };
  commuteOverlap: {
    action(d: { open: boolean; mode: string; worst: string; best: string }): string;
    why(d: { leg: "to-work" | "home"; leave: string; arrive: string; worst: string; worstAvg: number }): string;
    impact(d: { pct: number; best: string; bestAvg: number; micrograms: number; open: boolean; n95: number }): string;
    forYou(mode: string, km: number): string;
  };
  mask: { action: string; why(reading: string): string; impact(pct: number): string };
  exercise: { action: string; why(reading: string): string; impact(x: number): string };
  commuteExposure: { action(to: string, from: string, km: number): string; why(to: string): string; impact(pct: number): string; forYou: string };
  purifier: { own: string; diy(costInr: string): string; hepa(cadr: number): string; why: string; impact(pct: number, volume: number): string };
  ventilation: { action(best: string): string; why: string; impactMeasured(pct: number, worst: string): string; impactDefault: string; forYou: string };
  cooking: { action: string; why: string; impact(pct: number, cfm: number): string };
  smoke: { action: string; why: string; impact(low: number, high: number): string };
  plants: { action: string; why: string; impact(low: number, high: number): string; forYou: string };
  transit: { action(to: string, from: string): string; why: string; impact(kg: Kg): string; forYou(km: number): string };
  carpool: { action: string; why: string; impact(kg: Kg): string; forYou(km: number): string };
  wfh: { action(aqi: number): string; why: string; impact(kg: Kg): string; forYou: string };
  active: { action(aqi: number, km: number): string; why: string; impact(weeklyKg: number): string; forYou(km: number): string };
  burning: { action: string; why: string; impact(kg: number, grams: number): string; forYou: string };
}
