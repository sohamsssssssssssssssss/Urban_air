import { expect, test } from "@playwright/test";
import { axeScan, stubApis } from "./stubs";

// One smoke test, one step per v2 feature, so a regression names the feature that broke.
test("v2 feature smoke", async ({ page }) => {
  const { feedback } = await stubApis(page);
  // Count every call to Notification.requestPermission: the app must never ask on its own.
  await page.addInitScript(() => {
    const counter = window as unknown as { __permissionAsks: number };
    counter.__permissionAsks = 0;
    if ("Notification" in window) {
      const original = Notification.requestPermission.bind(Notification);
      Notification.requestPermission = (...args: Parameters<typeof original>) => {
        counter.__permissionAsks++;
        return original(...args);
      };
    }
  });
  await page.goto("/");

  await test.step("setup: submit the household form", async () => {
    await page.getByLabel("Children").check();
    await page.getByRole("button", { name: "Get my plan" }).click();
    await expect(page.getByRole("region", { name: "Air quality now" })).toContainText("AQI 374");
  });

  await test.step("today in one line: window, windows and mask in a sentence", async () => {
    const today = page.getByRole("region", { name: "Today in one line" });
    await expect(today).toContainText("Keep windows shut");
    await expect(today).toContainText("close-fitted N95");
  });

  await test.step("checklist: tick an item, it is remembered after a reload", async () => {
    const list = page.getByRole("region", { name: "Household checklist for today" });
    await list.getByRole("checkbox").first().check();
    await expect(list).toContainText("1 of 4 done");
    await page.reload();
    await page.getByLabel("Children").check(); // the form itself is not persisted, only the checklist ticks
    await page.getByRole("button", { name: "Get my plan" }).click();
    await expect(page.getByRole("region", { name: "Household checklist for today" })).toContainText("1 of 4 done");
  });

  await test.step("mask guide: N95 for commuting, children note, cited sources", async () => {
    const guide = page.getByRole("region", { name: "Mask guide" });
    await expect(guide).toContainText("Close-fitted N95/FFP2 (or N99)");
    await expect(guide).toContainText("NIOSH has not approved any for children");
    await expect(guide.getByRole("link", { name: /Ministry of Health and Family Welfare/ })).toBeVisible();
  });

  await test.step("48h outlook: labelled as a forecast, three windows, chart with a text alternative", async () => {
    const outlook = page.getByRole("region", { name: "Next 48 hours" });
    await expect(outlook).toContainText("Model forecast (CAMS), not a measurement");
    await expect(outlook.getByRole("listitem")).toHaveCount(3);
    await expect(outlook.getByRole("img", { name: "Forecast PM2.5 for the next 48 hours" })).toBeVisible();
  });

  await test.step("compare two places: side-by-side cards and a computed sentence", async () => {
    const compare = page.getByRole("region", { name: "Compare two places" });
    await compare.getByRole("button", { name: "Compare" }).click();
    await expect(compare).toContainText("Mumbai has cleaner air right now: AQI 120 against 330 in Delhi (210 points lower).");
    await expect(compare.getByRole("listitem")).toHaveCount(2);
  });

  await test.step("commute tracker: log a trip manually, and from a planned route", async () => {
    const tracker = page.getByRole("region", { name: "Commute impact tracker" });
    await tracker.getByLabel("Mode", { exact: true }).selectOption("metro");
    await tracker.getByLabel("Distance (km)").fill("10");
    await tracker.getByRole("button", { name: "Log trip" }).click();
    await expect(tracker.getByText("Trip logged.")).toBeVisible();
    await expect(tracker.getByRole("heading", { name: "This week" }).locator("..")).toContainText("1 trip · 10 km");

    const planner = page.getByRole("region", { name: "Cleaner routes" });
    await planner.getByLabel("From").fill("Colaba Causeway, Mumbai");
    await planner.getByLabel("To").fill("Bandra Kurla Complex, Mumbai");
    await planner.getByRole("button", { name: "Find routes" }).click();
    await planner.getByRole("button", { name: "Log this trip: cycling, route 1" }).click();
    await expect(tracker).toContainText("Prefilled from the route you chose");
    await expect(tracker.getByLabel("Distance (km)")).toHaveValue("19.1");
  });

  await test.step("air alerts: honest limit, opt-in banner at the top, permission never auto-requested", async () => {
    const alerts = page.getByRole("region", { name: "Air alerts" });
    await expect(alerts).toContainText("work only while SmogSense is open");
    await alerts.getByRole("button", { name: "In-app alerts" }).click();
    await expect(alerts).toContainText("Last checked");
    await expect(page.locator("#alert-slot").getByRole("alert")).toContainText("Air alert: AQI 374 (Very Poor)");
    expect(await page.evaluate(() => (window as unknown as { __permissionAsks: number }).__permissionAsks)).toBe(0);
  });

  await test.step("kid-friendly mode: simpler wording on request, saved on this device", async () => {
    await page.getByRole("checkbox", { name: "Kid-friendly wording" }).check();
    await expect(page.getByRole("tabpanel")).toContainText("Go out to play between");
    await expect(page.getByRole("tabpanel")).not.toContainText("Schedule outdoor errands");
    await page.getByRole("tab", { name: /Indoor air/ }).click();
    await expect(page.getByRole("tabpanel")).toContainText("tiny dust");
    expect(await page.evaluate(() => window.localStorage.getItem("smogsense:v1:kids"))).toBe("true");
    await page.getByRole("checkbox", { name: "Kid-friendly wording" }).uncheck();
    await expect(page.getByRole("tab", { name: /Daily routines/ })).toBeVisible();
  });

  await test.step("tip feedback: one anonymous vote, nothing but the tip id and the vote is sent", async () => {
    await page.getByRole("tab", { name: /Daily routines/ }).click();
    const helpful = page.getByRole("tabpanel").getByRole("button", { name: "Helpful" }).first();
    await helpful.click();
    await expect(helpful).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => feedback.length).toBe(1);
    expect(Object.keys(feedback[0] as object)).toEqual(["tipId", "vote"]);
    expect(feedback[0]).toMatchObject({ vote: "up" });
  });

  await test.step("accessibility: no axe violations with all sections open", async () => {
    expect((await axeScan(page)).violations).toEqual([]);
  });
});

test("PWA assets: manifest, icons and the minimal service worker are served", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "SmogSense", display: "standalone", start_url: "/" });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(["any", "192x192", "512x512"]);
  for (const size of [192, 512]) {
    const icon = await request.get(`/pwa-icon/${size}`);
    expect(icon.status()).toBe(200);
    expect(icon.headers()["content-type"]).toBe("image/png");
  }
  expect((await request.get("/pwa-icon/300")).status()).toBe(404);
  const sw = await request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(await sw.text()).toContain("notificationclick");
  expect(await sw.text()).not.toContain('addEventListener("fetch"'); // no caching, no network interception
});
