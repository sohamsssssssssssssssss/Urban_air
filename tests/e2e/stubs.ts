import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ruleBasedAdvice } from "../../src/lib/ai/fallback";
import { buildFacts } from "../../src/lib/impact/facts";
import { cleanestWindows, parseForecast } from "../../src/features/outlook/logic";
import { profile, snapshot } from "../fixtures/data";
import openMeteo from "../fixtures/live/open-meteo-mumbai.json";
import { routeResult } from "../fixtures/route";

const advice = ruleBasedAdvice(snapshot, buildFacts(snapshot, profile, true));
const forecast = parseForecast(openMeteo.hourly);

/** Stubs every API the feature smoke test touches, so it is deterministic and needs no keys. */
export async function stubApis(page: Page): Promise<{ feedback: unknown[] }> {
  const feedback: unknown[] = [];
  await page.route("**/api/feedback", (r) => {
    feedback.push(r.request().postDataJSON());
    return r.fulfill({ status: 204 });
  });
  await page.route("**/api/air?*", (r) => r.fulfill({ json: { snapshot } }));
  await page.route("**/api/advice", (r) => {
    const kids = (r.request().postDataJSON() as { tone?: string }).tone === "kids";
    const body = kids ? ruleBasedAdvice(snapshot, buildFacts(snapshot, profile, true, "en", "kids")) : advice;
    return r.fulfill({ json: { snapshot, advice: body, generatedBy: "rules" } });
  });
  await page.route("**/api/outlook?*", (r) => r.fulfill({ json: { outlook: { hours: forecast, windows: cleanestWindows(forecast), source: "Open-Meteo (CAMS)" } } }));
  await page.route("**/api/compare", (r) => r.fulfill({ json: {
    a: { status: "ok", label: "Mumbai", aqi: 120, category: "Moderate", dominant: "pm25", station: "Worli, Mumbai - MPCB", source: "OpenAQ", measuredAt: "2026-11-23T05:00:00Z", stale: false, bestWindow: "14:00–17:00", windowMeasured: true },
    b: { status: "ok", label: "Delhi", aqi: 330, category: "Very Poor", dominant: "pm25", station: "ITO, Delhi", source: "CPCB", measuredAt: "2026-11-23T05:00:00Z", stale: false, bestWindow: "13:00–17:00", windowMeasured: false },
  } }));
  await page.route("**/api/route", (r) => r.fulfill({ json: routeResult }));
  await page.route("**/api/chat", (r) => r.fulfill({ contentType: "text/plain", body: "Keep the kids indoors until 13:00." }));
  return { feedback };
}

export const axeScan = (page: Page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
