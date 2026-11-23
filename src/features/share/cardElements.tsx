import type { ReactElement } from "react";
import type { AqiCategory } from "@/lib/aq/types";
import { CATEGORY_LABEL, type Language } from "@/lib/i18n";
import type { MaskLevel } from "../mask/logic";
import { CARD_FONT_FAMILY, CARD_HEIGHT, CARD_WIDTH, CATEGORY_ACCENT, type CardPeriod } from "./constants";
import { toVisualOrder } from "./devanagari";
import { CARD_STRINGS } from "./strings";

export interface TodayCardData {
  city: string;
  aqi: number;
  category: AqiCategory;
  window: string;
  windowMeasured: boolean;
  mask: MaskLevel;
  station: string;
  time: string;
  source: string;
}

export interface WeeklyCardData {
  period: CardPeriod;
  trips: number;
  km: number;
  co2: number;
  pm25: number;
}

const frame = { display: "flex", flexDirection: "column", width: CARD_WIDTH, height: CARD_HEIGHT, padding: 56, background: "#0f172a", color: "#ffffff", fontFamily: CARD_FONT_FAMILY } as const;
const muted = "#cbd5e1";
const r1 = (n: number) => String(Math.round(n * 10) / 10);

/** The "today" card: city, AQI, category (as text), best time outside and the mask decision. All values are computed in code. */
export function todayCard(d: TodayCardData, lang: Language): ReactElement {
  const t = CARD_STRINGS[lang];
  const v = (text: string) => (lang === "hi" ? toVisualOrder(text) : text);
  return (
    <div style={frame}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 34, fontWeight: 700 }}>
        <span>{v(t.brand)}</span>
        <span>{d.city}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 36 }}>
        <div style={{ display: "flex", width: 14, height: 210, background: CATEGORY_ACCENT[d.category], marginRight: 36 }} />
        <div style={{ display: "flex", fontSize: 220, fontWeight: 700, lineHeight: 1 }}>{d.aqi}</div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 44 }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700 }}>{v(CATEGORY_LABEL[lang][d.category])}</div>
          <div style={{ display: "flex", fontSize: 32, color: muted }}>{v(t.aqi)}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>{v(t.bestTime(d.window, d.windowMeasured))}</div>
        <div style={{ display: "flex", fontSize: 36, marginTop: 10 }}>{v(t.mask[d.mask])}</div>
        <div style={{ display: "flex", fontSize: 24, color: muted, marginTop: 22 }}>{v(t.source(d.station, d.time, d.source))}</div>
      </div>
    </div>
  );
}

/** The weekly/monthly impact card from the user's own tracker totals. Labelled self-reported and estimated. */
export function weeklyCard(d: WeeklyCardData, lang: Language): ReactElement {
  const t = CARD_STRINGS[lang];
  const v = (text: string) => (lang === "hi" ? toVisualOrder(text) : text);
  const co2 = d.co2 >= 0 ? t.co2Avoided(r1(d.co2)) : t.co2Extra(r1(-d.co2));
  const pm = d.pm25 >= 0 ? t.pmAvoided(r1(d.pm25)) : t.pmExtra(r1(-d.pm25));
  return (
    <div style={frame}>
      <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>{v(t.brand)}</div>
      <div style={{ display: "flex", fontSize: 58, fontWeight: 700, marginTop: 28 }}>{v(t.weeklyTitle[d.period])}</div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "#86efac" }}>{v(co2)}</div>
        <div style={{ display: "flex", fontSize: 38, marginTop: 18 }}>{v(pm)}</div>
        <div style={{ display: "flex", fontSize: 34, color: muted, marginTop: 18 }}>{v(t.tripsKm(d.trips, r1(d.km)))}</div>
      </div>
      <div style={{ display: "flex", fontSize: 26, color: muted, marginTop: "auto" }}>{v(t.selfReported)}</div>
    </div>
  );
}
