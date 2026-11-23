/**
 * Live smoke test against REAL OpenAQ, CPCB and Gemini (not part of CI; needs keys or a deployed URL).
 *   npm run smoke:live                       # direct: calls each upstream from this machine (.env.local)
 *   BASE_URL=https://… npm run smoke:live    # deployed: exercises /api/air, /api/advice, /api/chat
 *   Append -- --no-ai to check live AQI without calling Gemini.
 * Never prints keys. With AI enabled, also checks for Gemini advice and a nonempty chat reply.
 */
import type { AQSnapshot } from "../src/lib/aq/types";

const CITIES = [
  { name: "Delhi", lat: 28.61, lon: 77.21 },
  { name: "Mumbai", lat: 19.07, lon: 72.88 },
  { name: "Bengaluru", lat: 12.97, lon: 77.59 },
] as const;
const PROFILE = { kids: true, elderly: false, respiratory: false, pets: false, commuteMode: "two_wheeler", commuteKm: 10, workStartHour: 9, workEndHour: 18, ownsPurifier: false, budget: "medium" } as const;
const QUESTION = "Is it okay to take my child to the park this evening?";
const BASE_URL = process.env.BASE_URL?.replace(/\/$/, "");
const NO_AI = process.argv.includes("--no-ai");

const ageMin = (iso: string) => Math.round((Date.now() - Date.parse(iso)) / 60_000);
const timed = async <T,>(fn: () => Promise<T>): Promise<[T, number]> => {
  const t = performance.now();
  const value = await fn();
  return [value, Math.round(performance.now() - t)];
};
const describe = (s: AQSnapshot) => {
  const distance = s.station.distanceM === undefined ? "" : ` (${(s.station.distanceM / 1000).toFixed(1)} km)`;
  return `${s.source} | ${s.sensorType} | ${s.station.name}${distance} | age ${ageMin(s.measuredAt)} min${s.stale ? " (STALE)" : ""} | AQI ${s.aqi} ${s.category} (${s.dominant})${s.provisional ? " (PROVISIONAL)" : ""}${s.history ? ` | ${s.history.length}h history` : ""}`;
};
const countItems = (a: { routines: unknown[]; indoor: unknown[]; alternatives: unknown[] }) => `${a.routines.length}/${a.indoor.length}/${a.alternatives.length}`;
let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log(`  ✗ ${msg}`);
};

async function direct(city: (typeof CITIES)[number]) {
  const { fetchOpenAQ } = await import("../src/lib/aq/openaq");
  const { fetchCPCB } = await import("../src/lib/aq/cpcb");
  const { getAirQuality, toSnapshot } = await import("../src/lib/aq");
  const loc = { lat: city.lat, lon: city.lon, city: city.name };

  for (const [label, load] of [["OpenAQ", () => fetchOpenAQ(loc, process.env.OPENAQ_API_KEY ?? "")], ["CPCB  ", () => fetchCPCB(loc, process.env.DATA_GOV_IN_API_KEY ?? "")]] as const) {
    try {
      const [reading, ms] = await timed(load);
      const s = toSnapshot(reading);
      console.log(`  ${label} ${ms} ms | ${s ? describe(s) : "reading rejected (too old / no PM)"}`);
    } catch (e) {
      console.log(`  ${label} unavailable: ${(e as Error).message}`);
    }
  }
  let snapshot: AQSnapshot;
  try {
    snapshot = await getAirQuality(loc);
  } catch {
    return fail("no live data from any source");
  }
  console.log(`  Selected | ${describe(snapshot)}`);
  if (NO_AI) return;
  const { getAdvice } = await import("../src/lib/ai/advisor");
  const { streamChat } = await import("../src/lib/ai/chat");
  const { hasMetro } = await import("../src/lib/http");
  const [result, adviceMs] = await timed(() => getAdvice(snapshot, PROFILE, "en", hasMetro(loc)));
  console.log(`  Advice ${adviceMs} ms | by ${result.generatedBy} | items routines/indoor/alternatives ${countItems(result.advice)}`);
  if (result.generatedBy !== "gemini") fail("Gemini advice rejected or unavailable (see warnings above)");
  const [answer, chatMs] = await timed(async () => new Response(await streamChat({ snapshot, profile: PROFILE, hasMetro: hasMetro(loc), language: "en", message: QUESTION, history: [] })).text());
  console.log(`  Chat   ${chatMs} ms | ${answer.length} chars | "${answer.slice(0, 110).replace(/\s+/g, " ")}…"`);
  if (!answer.trim()) fail("empty chat reply");
}

async function deployed(city: (typeof CITIES)[number]) {
  const location = { lat: city.lat, lon: city.lon, city: city.name };
  const [air, airMs] = await timed(() => fetch(`${BASE_URL}/api/air?lat=${city.lat}&lon=${city.lon}&city=${city.name}`));
  const airBody = await air.json();
  if (!air.ok) return fail(`/api/air ${air.status} ${airBody.error?.code}`);
  console.log(`  Air    ${airMs} ms | ${describe(airBody.snapshot)}`);
  if (NO_AI) return;
  const body = { location, profile: PROFILE, language: "en" };
  const [adv, advMs] = await timed(() => fetch(`${BASE_URL}/api/advice`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  const advBody = await adv.json();
  if (!adv.ok) return fail(`/api/advice ${adv.status} ${advBody.error?.code}`);
  console.log(`  Advice ${advMs} ms | by ${advBody.generatedBy} | items ${countItems(advBody.advice)}`);
  if (advBody.generatedBy !== "gemini") fail("deployed advice fell back to rules");
  const [chat, chatMs] = await timed(() => fetch(`${BASE_URL}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, message: QUESTION, history: [] }) }));
  const answer = await chat.text();
  console.log(`  Chat   ${chatMs} ms | ${chat.status} | "${answer.slice(0, 110).replace(/\s+/g, " ")}…"`);
  if (!chat.ok || !answer.trim()) fail(`/api/chat ${chat.status}`);
}

/** v2 endpoints. None of them call Gemini, so they also run with --no-ai. */
async function v2Checks() {
  console.log("\nv2 features");
  if (!BASE_URL) {
    const { getOutlook } = await import("../src/features/outlook/server");
    const [outlook, ms] = await timed(() => getOutlook(19.07, 72.88));
    console.log(`  Outlook ${ms} ms | ${outlook.hours.length} h forecast (${outlook.source}) | ${outlook.windows.length} cleanest windows`);
    if (outlook.hours.length < 24 || outlook.windows.length === 0) fail("forecast looks empty");
    return;
  }
  const get = async (label: string, path: string, init?: RequestInit) => {
    const [res, ms] = await timed(() => fetch(`${BASE_URL}${path}`, init));
    const bytes = Buffer.from(await res.arrayBuffer());
    console.log(`  ${label.padEnd(9)} ${ms} ms | ${res.status} ${res.headers.get("content-type")} ${bytes.length} B`);
    return { res, bytes };
  };
  const { res: outRes, bytes: outBytes } = await get("Outlook", "/api/outlook?lat=19.07&lon=72.88");
  const outlook = outRes.ok ? (JSON.parse(outBytes.toString()) as { outlook: { hours: unknown[]; windows: unknown[] } }).outlook : null;
  if (!outlook || outlook.hours.length < 24 || outlook.windows.length === 0) fail("/api/outlook returned no usable forecast");
  const { res: cmp, bytes: cmpBytes } = await get("Compare", "/api/compare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ a: { lat: 19.076, lon: 72.8777, city: "Mumbai" }, b: { lat: 28.6139, lon: 77.209, city: "Delhi" }, language: "en" }) });
  const sides = cmp.ok ? (JSON.parse(cmpBytes.toString()) as Record<string, { status: string }>) : {};
  if (sides.a?.status !== "ok" || sides.b?.status !== "ok") fail("/api/compare did not return both places");
  const { res: card, bytes: png } = await get("Card", "/api/card?kind=weekly&period=week&trips=5&km=62.5&co2=7.2&pm25=140.4&lang=hi");
  if (!card.ok || png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) fail("/api/card did not return a 1200x630 PNG");
  const { res: manifest } = await get("Manifest", "/manifest.webmanifest");
  const { res: sw } = await get("Worker", "/sw.js");
  if (!manifest.ok || !sw.ok) fail("PWA assets missing");
}

console.log(`SmogSense live smoke · ${new Date().toISOString()} · ${BASE_URL ? `deployed ${BASE_URL}` : "direct upstream calls"}${NO_AI ? " · air quality only" : ""}`);
for (const city of CITIES) {
  console.log(`\n${city.name} (${city.lat}, ${city.lon})`);
  await (BASE_URL ? deployed(city) : direct(city));
}
await v2Checks();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll live checks passed");
process.exit(failures ? 1 : 0);
