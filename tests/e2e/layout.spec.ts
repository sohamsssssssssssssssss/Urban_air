import { expect, test } from "@playwright/test";
import { axeScan, onboard, stubApis } from "./stubs";

// Layout checks at the widths that matter, in light and dark. Screenshots are saved as artifacts for humans to look at;
// nothing is compared pixel by pixel. The assertions are about structure: no sideways scroll, the right navigation, no axe violations.
const SECTIONS = ["today", "plan", "routes", "outlook", "me"] as const;
const VIEWPORTS = [
  { name: "320", width: 320, height: 700 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 900 },
  { name: "zoom200", width: 640, height: 450 }, // a 1280 px window at 200% browser zoom is 640 CSS px wide
] as const;

for (const scheme of ["light", "dark"] as const) {
  for (const vp of VIEWPORTS) {
    test(`${vp.name}px ${scheme}: all five sections lay out, reflow, and pass axe`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await stubApis(page);
      await page.goto("/");
      await onboard(page, { kids: true });
      await expect(page.getByRole("region", { name: "Air quality now" })).toContainText("AQI 374");

      const sidebar = vp.width >= 1024;
      await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible(); // exactly one of the two is displayed
      await expect(page.getByRole("link", { name: "Today", exact: true })).toHaveAttribute("aria-current", "page");
      const box = await page.getByRole("navigation", { name: "Main navigation" }).boundingBox();
      expect(sidebar ? box!.x : box!.y + box!.height).toBe(sidebar ? 0 : vp.height); // left edge vs. bottom edge

      for (const id of SECTIONS) {
        await page.goto(`/#${id}`);
        await expect(page.getByRole("link", { name: id === "me" ? "Me" : id[0]!.toUpperCase() + id.slice(1), exact: true })).toHaveAttribute("aria-current", "page");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `horizontal overflow in #${id}`).toBeLessThanOrEqual(0);
        expect((await axeScan(page)).violations, `axe in #${id}`).toEqual([]);
        await page.screenshot({ path: `screenshots/${vp.name}-${scheme}-${id}.png`, fullPage: true });
      }
    });
  }
}
