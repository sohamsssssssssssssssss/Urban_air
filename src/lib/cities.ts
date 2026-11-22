/** Major Indian cities offered in onboarding. `name` matches the CPCB feed's city field. */
export const CITIES = [
  { name: "Delhi", lat: 28.6139, lon: 77.209, hasMetro: true },
  { name: "Noida", lat: 28.5355, lon: 77.391, hasMetro: true },
  { name: "Gurugram", lat: 28.4595, lon: 77.0266, hasMetro: true },
  { name: "Ghaziabad", lat: 28.6692, lon: 77.4538, hasMetro: true },
  { name: "Lucknow", lat: 26.8467, lon: 80.9462, hasMetro: true },
  { name: "Kanpur", lat: 26.4499, lon: 80.3319, hasMetro: true },
  { name: "Patna", lat: 25.5941, lon: 85.1376, hasMetro: false },
  { name: "Jaipur", lat: 26.9124, lon: 75.7873, hasMetro: true },
  { name: "Chandigarh", lat: 30.7333, lon: 76.7794, hasMetro: false },
  { name: "Kolkata", lat: 22.5726, lon: 88.3639, hasMetro: true },
  { name: "Mumbai", lat: 19.076, lon: 72.8777, hasMetro: true },
  { name: "Pune", lat: 18.5204, lon: 73.8567, hasMetro: true },
  { name: "Ahmedabad", lat: 23.0225, lon: 72.5714, hasMetro: true },
  { name: "Hyderabad", lat: 17.385, lon: 78.4867, hasMetro: true },
  { name: "Bengaluru", lat: 12.9716, lon: 77.5946, hasMetro: true },
  { name: "Chennai", lat: 13.0827, lon: 80.2707, hasMetro: true },
] as const;

export type City = (typeof CITIES)[number];
export type CityName = City["name"];
export const CITY_NAMES = CITIES.map((c) => c.name) as [CityName, ...CityName[]];

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Great-circle (haversine) distance in km. Returns NaN for non-finite input.
 */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Nearest supported city to a coordinate (used when the user shares GPS location). */
export function nearestCity(lat: number, lon: number): City {
  return CITIES.reduce((best, c) => (distanceKm(lat, lon, c.lat, c.lon) < distanceKm(lat, lon, best.lat, best.lon) ? c : best), CITIES[0]);
}

/** Looks up a city by name. */
export function findCity(name: string | undefined): City | undefined {
  return CITIES.find((c) => c.name === name);
}
