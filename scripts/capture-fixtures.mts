/**
 * One-off: captures trimmed real API responses into tests/fixtures/live/ (keys are never written).
 * Run: npx tsx --env-file=.env.local --conditions=react-server scripts/capture-fixtures.mts
 */
import { writeFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { adviceSystemPrompt, buildContext } from "../src/lib/ai/prompts";
import { modelAdviceJsonSchema } from "../src/lib/ai/schema";
import { toSnapshot } from "../src/lib/aq";
import { fetchOpenAQ } from "../src/lib/aq/openaq";
import { buildFacts } from "../src/lib/impact/facts";

const OUT = "tests/fixtures/live";
const H = { "X-API-Key": process.env.OPENAQ_API_KEY ?? "" };
const save = (name: string, data: unknown) => writeFileSync(`${OUT}/${name}.json`, JSON.stringify(data, null, 1) + "\n");
const get = async (url: string, headers: Record<string, string> = {}) => (await fetch(url, { headers })).json();

const [lat, lon] = [28.61, 77.21];
const locs = await get(`https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=25000&limit=100`, H);
type Loc = { id: number; distance: number; datetimeLast?: { utc: string } | null; sensors: unknown[]; name: string; locality: string | null };
const now = Date.now();
const all = locs.results as Loc[];
const fresh = all.filter((l) => l.datetimeLast && now - Date.parse(l.datetimeLast.utc) < 3 * 3600e3).sort((a, b) => a.distance - b.distance).slice(0, 3);
const dead = all.filter((l) => !l.datetimeLast || now - Date.parse(l.datetimeLast.utc) > 365 * 86400e3).slice(0, 2);
const keep = (l: Loc) => ({ id: l.id, name: l.name, locality: l.locality, distance: l.distance, datetimeLast: l.datetimeLast, sensors: l.sensors });
save("openaq-locations-delhi", { capturedAt: new Date(now).toISOString(), results: [...dead, ...fresh].map(keep) });
for (const l of fresh) save(`openaq-latest-${l.id}`, { results: (await get(`https://api.openaq.org/v3/locations/${l.id}/latest`, H)).results.map((r: { datetime: unknown; value: number; sensorsId: number }) => ({ datetime: r.datetime, value: r.value, sensorsId: r.sensorsId })) });

const reading = await fetchOpenAQ({ lat, lon }, process.env.OPENAQ_API_KEY ?? "", now);
const pm25Id = (fresh.find((l) => `openaq:${l.id}` === reading.station.id)?.sensors as Array<{ id: number; parameter: { name: string } }>).find((s) => s.parameter.name === "pm25")?.id;
const from = new Date(now - 24 * 3600e3).toISOString();
const hours = await get(`https://api.openaq.org/v3/sensors/${pm25Id}/hours?datetime_from=${from}&datetime_to=${new Date(now).toISOString()}&limit=48`, H);
save(`openaq-hours-${pm25Id}`, { results: hours.results.map((r: { value: number; period: { datetimeFrom: unknown } }) => ({ value: r.value, period: { datetimeFrom: r.period.datetimeFrom } })) });

const cpcb = await get(`https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?${new URLSearchParams({ "api-key": process.env.DATA_GOV_IN_API_KEY ?? "", format: "json", limit: "1000", "filters[city]": "Delhi" })}`);
const stations = [...new Set((cpcb.records as Array<{ station: string }>).map((r) => r.station))].slice(0, 3);
save("cpcb-delhi", { title: cpcb.title, total: cpcb.total, records: cpcb.records.filter((r: { station: string }) => stations.includes(r.station)) });

const snapshot = toSnapshot(reading, now);
if (!snapshot) throw new Error("no snapshot");
const profile = { kids: true, elderly: false, respiratory: false, pets: false, commuteMode: "car", commuteKm: 12, workStartHour: 9, workEndHour: 18, ownsPurifier: false, budget: "low" } as const;
save("snapshot-delhi", snapshot);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { apiVersion: "v1beta" } });
for (const lang of ["en", "hi"] as const) {
  const facts = buildFacts(snapshot, profile, true, lang);
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `CONTEXT: ${buildContext(snapshot, profile, facts)}`,
    config: { systemInstruction: adviceSystemPrompt(lang), responseMimeType: "application/json", responseJsonSchema: modelAdviceJsonSchema, maxOutputTokens: 4096, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
  });
  save(`gemini-advice-${lang}`, { finishReason: res.candidates?.[0]?.finishReason, text: res.text });
  console.log(lang, res.candidates?.[0]?.finishReason, res.usageMetadata?.candidatesTokenCount, "tokens");
}
console.log("station", snapshot.station.name, "aqi", snapshot.aqi, "history", snapshot.history?.length, "pm25 sensor", pm25Id);
