import { describe, expect, it } from "vitest";
import { AQI_CATEGORIES, aqiDark, aqiLight, dark, light, type Theme } from "@/design/tokens";
import { contrast } from "../fixtures/contrast";

const AA_TEXT = 4.5;
const AA_GRAPHIC = 3;
const themes: Array<[string, Theme, typeof aqiLight]> = [["light", light, aqiLight], ["dark", dark, aqiDark]];

describe.each(themes)("%s theme meets WCAG AA", (_, t, aqi) => {
  it("body and secondary text on every surface", () => {
    for (const bg of ["canvas", "surface", "sunken", "brandSoft"] as const) {
      expect(contrast(t.ink, t[bg]), `ink on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(t.inkMuted, t[bg]), `inkMuted on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it("buttons and links", () => {
    expect(contrast(t.brandInk, t.brand), "label on brand").toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(t.brandInk, t.brandHover), "label on brand hover").toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(t.dangerInk, t.danger), "label on danger").toBeGreaterThanOrEqual(AA_TEXT);
    for (const bg of ["canvas", "surface", "sunken", "brandSoft"] as const) expect(contrast(t.brandText, t[bg]), `link on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("status messages", () => {
    expect(contrast(t.dangerText, t.dangerSoft), "error text").toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(t.warnText, t.warnSoft), "warning text").toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(t.okText, t.okSoft), "ok text").toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("form control borders, focus ring and status accents are visible (3:1)", () => {
    for (const bg of ["canvas", "surface", "sunken"] as const) {
      expect(contrast(t.lineStrong, t[bg]), `control border on ${bg}`).toBeGreaterThanOrEqual(AA_GRAPHIC);
      expect(contrast(t.focus, t[bg]), `focus ring on ${bg}`).toBeGreaterThanOrEqual(AA_GRAPHIC);
    }
    expect(contrast(t.ok, t.okSoft), "ok accent").toBeGreaterThanOrEqual(AA_GRAPHIC);
    expect(contrast(t.warn, t.warnSoft), "warn accent").toBeGreaterThanOrEqual(AA_GRAPHIC);
  });

  it.each(AQI_CATEGORIES)("AQI hero for %s: text on the tint, and the accent against it", (category) => {
    const { tint, accent } = aqi[category];
    expect(contrast(t.ink, tint), "ink on tint").toBeGreaterThanOrEqual(7);
    expect(contrast(t.inkMuted, tint), "muted on tint").toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(t.brandText, tint), "link on tint").toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(accent, tint), "accent on tint").toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(accent, t.surface), "accent on card").toBeGreaterThanOrEqual(AA_GRAPHIC);
  });
});

describe("the six AQI colours are distinct from each other in both themes", () => {
  it.each(themes)("%s", (_, __, aqi) => {
    const accents = new Set(AQI_CATEGORIES.map((c) => aqi[c].accent.join(",")));
    expect(accents.size).toBe(AQI_CATEGORIES.length);
  });
});
