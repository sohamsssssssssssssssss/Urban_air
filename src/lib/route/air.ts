import "server-only";
import { getAirQuality } from "../aq";
import { concentrationFromSubIndex } from "../aq/naqi";
import { AQUnavailableError } from "../errors";
import { nearestCity } from "../cities";
import { MIN_HISTORY_POINTS } from "../constants";
import { hourProfile } from "../impact/timing";
import { NEAR_MONITOR_MAX_M } from "./constants";
import type { Ambient, Place } from "./types";

/**
 * Ambient PM2.5 for a route: the nearest fresh reference monitor's 24 h hourly profile.
 * If no monitor answers for the origin, the nearest city's reading is used and the result is
 * marked approximate. A monitor farther than 25 km, or a value inferred from a CPCB sub-index, is also approximate.
 * @throws AQUnavailableError when neither the origin nor the city has live data
 */
export async function resolveAmbient(origin: Place): Promise<Ambient> {
  let usedCity = false;
  const snapshot = await getAirQuality({ lat: origin.lat, lon: origin.lon }).catch(async (err: unknown) => {
    if (!(err instanceof AQUnavailableError)) throw err;
    const city = nearestCity(origin.lat, origin.lon);
    usedCity = true;
    return getAirQuality({ lat: city.lat, lon: city.lon, city: city.name });
  });
  const far = snapshot.station.distanceM === undefined || snapshot.station.distanceM > NEAR_MONITOR_MAX_M;
  const base = { station: snapshot.station.name, source: snapshot.source, measuredAt: snapshot.measuredAt };

  if (snapshot.history && snapshot.history.length >= MIN_HISTORY_POINTS) {
    return { ...base, byHour: hourProfile(snapshot.history), basis: "hourly-profile", approximate: usedCity || far };
  }
  if (snapshot.pollutants.pm25 !== undefined) return { ...base, flat: snapshot.pollutants.pm25, basis: "latest", approximate: usedCity || far };
  const sub = snapshot.subIndices.pm25;
  if (sub === undefined) throw new AQUnavailableError("No PM2.5 reading is available to estimate exposure on this route.");
  return { ...base, flat: concentrationFromSubIndex("pm25", sub), basis: "sub-index", approximate: true };
}
