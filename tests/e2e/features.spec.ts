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

  await test.step("accessibility: no axe violations with all sections open", async () => {
    expect((await axeScan(page)).violations).toEqual([]);
  });
});
