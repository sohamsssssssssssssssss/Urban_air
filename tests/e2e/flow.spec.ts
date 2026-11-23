import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ruleBasedAdvice } from "../../src/lib/ai/fallback";
import { buildFacts } from "../../src/lib/impact/facts";
import { profile, snapshot } from "../fixtures/data";
import { routeResult } from "../fixtures/route";
import { onboard, openSection } from "./stubs";

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

test("onboarding -> AQI hero -> plan tabs -> chat dialog, accessible throughout", async ({ page }) => {
  await stubApi(page);
  const aiCalls: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/advice" || path === "/api/chat") aiCalls.push(path);
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
  expect((await axeScan(page)).violations).toEqual([]);
  expect(aiCalls).toEqual([]);

  await onboard(page, { kids: true });
  const card = page.getByRole("region", { name: "Air quality now" });
  await expect(card).toContainText("AQI 374");
  await expect(card.getByText("Very Poor", { exact: true })).toBeVisible();
  expect(aiCalls).toEqual([]); // the plan (Gemini) is only requested when the Plan section opens

  await openSection(page, "Plan");
  await expect(page).toHaveURL(/#plan$/);
  for (const name of [/Daily routines/, /Indoor air/, /Greener choices/]) {
    await page.getByRole("tab", { name }).click();
    await expect(page.getByRole("tabpanel").filter({ visible: true })).toContainText("Impact");
  }
  await page.getByRole("tab", { name: /Greener choices/ }).press("Home");
  await expect(page.getByRole("tab", { name: /Daily routines/ })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();

  await page.getByRole("button", { name: "Ask" }).click();
  const dialog = page.getByRole("dialog", { name: "Ask SmogSense" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Your question").fill("Can my child play outside?");
  await dialog.getByRole("button", { name: "Ask" }).click();
  await expect(dialog.getByRole("log")).toContainText("Keep the kids indoors until 13:00.");
  expect((await axeScan(page)).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Ask" })).toBeFocused();
});

test("shows an explicit unavailable state and no advice when live data is missing", async ({ page }) => {
  await stubApi(page, 503);
  await page.goto("/");
  await onboard(page);
  await expect(page.getByRole("region", { name: "Air quality now" }).getByRole("alert")).toContainText("Live data unavailable");
  await expect(page.getByRole("tab")).toHaveCount(0);
});

test("skip link and security headers", async ({ page }) => {
  const res = await page.goto("/");
  const headers = res?.headers() ?? {};
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.getByRole("button", { name: "हिन्दी" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("आज");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "data.gov.in पर CPCB" })).toBeVisible();
});

test("route planner: places in, ranked routes out, accessible", async ({ page }) => {
  await stubApi(page);
  await page.route("**/api/route", (r) => r.fulfill({ json: routeResult }));
  await page.goto("/#routes"); // deep link straight to a section
  await page.getByLabel("From").fill("Colaba Causeway, Mumbai");
  await page.getByLabel("To", { exact: true }).fill("Bandra Kurla Complex, Mumbai");
  await page.getByRole("button", { name: "Find routes" }).click();
  const section = page.getByRole("region", { name: "Cleaner routes" });
  await expect(section.getByText("Cleanest air")).toBeVisible();
  await expect(section).toContainText("Lowest estimated PM2.5 inhaled (7.9 µg)");
  await expect(section).toContainText("not measured on the route");
  expect((await axeScan(page)).violations).toEqual([]);
});
