import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ruleBasedAdvice } from "../../src/lib/ai/fallback";
import { buildFacts } from "../../src/lib/impact/facts";
import { profile, snapshot } from "../fixtures/data";

// Browser-level E2E: the server routes are covered by integration tests, so here we stub the
// network to make the UI flow deterministic without API keys.
const advice = ruleBasedAdvice(snapshot, buildFacts(snapshot, profile, true));

async function stubApi(page: Page, airStatus = 200) {
  await page.route("**/api/air?*", (r) =>
    airStatus === 200
      ? r.fulfill({ json: { snapshot } })
      : r.fulfill({ status: 503, json: { error: { code: "AQ_UNAVAILABLE", message: "Live air-quality data is unavailable for this location right now." } } }),
  );
  await page.route("**/api/advice", (r) =>
    airStatus === 200 ? r.fulfill({ json: { snapshot, advice, generatedBy: "rules" } }) : r.fulfill({ status: 503, json: { error: { code: "AQ_UNAVAILABLE", message: "x" } } }),
  );
  await page.route("**/api/chat", (r) => r.fulfill({ contentType: "text/plain", body: "Keep the kids indoors until 13:00." }));
}

const axeScan = (page: Page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test("onboarding -> AQI card -> three tabs -> chat reply, accessible throughout", async ({ page }) => {
  await stubApi(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "SmogSense" })).toBeVisible();
  expect((await axeScan(page)).violations).toEqual([]);

  await page.getByLabel("City").selectOption("Delhi");
  await page.getByLabel("Children").check();
  await page.getByLabel("Usual mode").selectOption("car");
  await page.getByRole("button", { name: "Get my plan" }).click();

  const card = page.getByRole("region", { name: "Air quality now" });
  await expect(card).toContainText("AQI 374");
  await expect(card.getByText("Very Poor", { exact: true })).toBeVisible();

  for (const name of [/Daily routines/, /Indoor air/, /Greener choices/]) {
    await page.getByRole("tab", { name }).click();
    await expect(page.getByRole("tabpanel")).toContainText("Impact");
  }
  await page.getByRole("tab", { name: /Greener choices/ }).press("Home");
  await expect(page.getByRole("tab", { name: /Daily routines/ })).toBeFocused();

  await page.getByLabel("Your question").fill("Can my child play outside?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByRole("log")).toContainText("Keep the kids indoors until 13:00.");

  expect((await axeScan(page)).violations).toEqual([]);
});

test("shows an explicit unavailable state and no advice when live data is missing", async ({ page }) => {
  await stubApi(page, 503);
  await page.goto("/");
  await page.getByRole("button", { name: "Get my plan" }).click();
  await expect(page.getByRole("region", { name: "Air quality now" }).getByRole("alert")).toContainText("Live data unavailable");
  await expect(page.getByRole("heading", { name: "Your plan" })).toHaveCount(0);
});

test("skip link and security headers", async ({ page }) => {
  const res = await page.goto("/");
  const headers = res?.headers() ?? {};
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
});
