import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ruleBasedAdvice } from "../../src/lib/ai/fallback";
import { buildFacts } from "../../src/lib/impact/facts";
import { cleanestWindows, parseForecast } from "../../src/features/outlook/logic";
import { profile, snapshot } from "../fixtures/data";
import openMeteo from "../fixtures/live/open-meteo-mumbai.json";

const advice = ruleBasedAdvice(snapshot, buildFacts(snapshot, profile, true));
const forecast = parseForecast(openMeteo.hourly);

/** Stubs every API the feature smoke test touches, so it is deterministic and needs no keys. */
export async function stubApis(page: Page): Promise<void> {
  await page.route("**/api/air?*", (r) => r.fulfill({ json: { snapshot } }));
  await page.route("**/api/advice", (r) => r.fulfill({ json: { snapshot, advice, generatedBy: "rules" } }));
  await page.route("**/api/outlook?*", (r) => r.fulfill({ json: { outlook: { hours: forecast, windows: cleanestWindows(forecast), source: "Open-Meteo (CAMS)" } } }));
  await page.route("**/api/chat", (r) => r.fulfill({ contentType: "text/plain", body: "Keep the kids indoors until 13:00." }));
}

export const axeScan = (page: Page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
