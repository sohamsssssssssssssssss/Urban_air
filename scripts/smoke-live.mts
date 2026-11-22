/**
 * Live smoke test against REAL OpenAQ, CPCB and Gemini (not part of CI; needs keys or a deployed URL).
 *   npm run smoke:live                       # direct: calls each upstream from this machine (.env.local)
 *   BASE_URL=https://… npm run smoke:live    # deployed: exercises /api/air, /api/advice, /api/chat
 * Never prints keys. Exits 1 if any city has no live data, no Gemini advice, or an empty chat reply.
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

const ageMin = (iso: string) => Math.round((Date.now() - Date.parse(iso)) / 60_000);
const timed = async <T,>(fn: () => Promise<T>): Promise<[T, number]> => {
  const t = performance.now();
  const value = await fn();
  return [value, Math.round(performance.now() - t)];
};
const describe = (s: AQSnapshot) => `${s.source} | ${s.station.name} | age ${ageMin(s.measuredAt)} min${s.stale ? " (STALE)" : ""} | AQI ${s.aqi} ${s.category} (${s.dominant})${s.history ? ` | ${s.history.length}h history` : ""}`;
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
  const { getAdvice } = await import("../src/lib/ai/advisor");
  const { streamChat } = await import("../src/lib/ai/chat");
  const { hasMetro } = await import("../src/lib/http");
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

console.log(`SmogSense live smoke · ${new Date().toISOString()} · ${BASE_URL ? `deployed ${BASE_URL}` : "direct upstream calls"}`);
for (const city of CITIES) {
  console.log(`\n${city.name} (${city.lat}, ${city.lon})`);
  await (BASE_URL ? deployed(city) : direct(city));
}
console.log(failures ? `\n${failures} check(s) failed` : "\nAll live checks passed");
process.exit(failures ? 1 : 0);
