import { expect, test } from "@playwright/test";
import { axeScan, stubApis } from "./stubs";

// One smoke test, one step per v2 feature, so a regression names the feature that broke.
test("v2 feature smoke", async ({ page }) => {
  await stubApis(page);
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

  await test.step("accessibility: no axe violations with all sections open", async () => {
    expect((await axeScan(page)).violations).toEqual([]);
  });
});
