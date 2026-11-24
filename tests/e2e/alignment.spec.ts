import { expect, test, type Page } from "@playwright/test";
import { onboard, stubApis } from "./stubs";

// Alignment contract for the five sections: one top offset for the h1, one left edge for content, the top bar lines up
// with the content column, the floating Ask button and tab bar never cover text at the end of a page, and nothing scrolls sideways.
const SECTIONS = ["Today", "Plan", "Routes", "Outlook", "Me"] as const;
const WIDTHS = [390, 768, 1280, 1600] as const;
const TOLERANCE = 2;

async function open(page: Page, width: number) {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.setViewportSize({ width, height: 800 });
  await stubApis(page);
  await page.goto("/");
  await onboard(page);
  await expect(page.getByRole("region", { name: "Air quality now" })).toContainText("AQI 374");
}

/** Text that sits under the floating Ask button or the tab bar at the current scroll position (rects, not guesses). */
const coveredText = (page: Page) =>
  page.evaluate(() => {
    const fixed = [...document.querySelectorAll<HTMLElement>("nav, button[aria-haspopup='dialog']")]
      .filter((el) => getComputedStyle(el).position === "fixed" && el.getBoundingClientRect().height > 0)
      .map((el) => el.getBoundingClientRect());
    const hits: string[] = [];
    const walker = document.createTreeWalker(document.querySelector("main")!, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width === 0 || r.height === 0) continue;
        for (const f of fixed) {
          if (r.left < f.right && r.right > f.left && r.top < f.bottom && r.bottom > f.top) hits.push(n.textContent.trim().slice(0, 40));
        }
      }
    }
    return hits;
  });

for (const width of WIDTHS) {
  test(`${width}px: h1, content edge, top bar edge, overlays and overflow line up in all five sections`, async ({ page }) => {
    await open(page, width);
    const h1Tops: number[] = [];
    for (const name of SECTIONS) {
      await page.getByRole("link", { name, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");

      const h1 = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
      h1Tops.push(h1.y);
      const card = (await page.locator("main section:visible").first().boundingBox())!;
      expect(Math.abs(h1.x - card.x), `h1 left vs card left in ${name}`).toBeLessThanOrEqual(TOLERANCE);

      if (width >= 1024) {
        const bar = (await page.locator("header > div").boundingBox())!;
        expect(Math.abs(bar.x + bar.width - (card.x + card.width)), `top bar right vs card right in ${name}`).toBeLessThanOrEqual(TOLERANCE);
      }

      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      expect(await coveredText(page), `text under overlays in ${name}`).toEqual([]);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `horizontal overflow in ${name}`).toBeLessThanOrEqual(0);
    }
    expect(Math.max(...h1Tops) - Math.min(...h1Tops), `h1 top offsets across sections: ${h1Tops.join(", ")}`).toBeLessThanOrEqual(TOLERANCE);
  });
}
