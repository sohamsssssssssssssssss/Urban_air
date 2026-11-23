"use client";

import { useEffect, useId, useState } from "react";
import { CITIES, type CityName } from "@/lib/cities";
import type { Language } from "@/lib/i18n";
import { readStored } from "../shared/storage";
import { TRACKER_STORAGE_KEY } from "../tracker/constants";
import { TrackerStateSchema } from "../tracker/schema";
import { CARD_HEIGHT, CARD_PERIODS, CARD_WIDTH, type CardPeriod } from "./constants";
import { todayCardUrl, weeklyCardUrl, weeklyNumbers, type WeeklyNumbers } from "./logic";
import { SHARE_STRINGS } from "./strings";

type Kind = "today" | "weekly";
const field = "mt-1 block min-h-11 w-full rounded-md border border-slate-500 bg-white px-3 py-2";
const btn = "min-h-11 rounded-md border px-5 py-2 font-semibold";
const EMPTY = { baseline: "car" as const, trips: [] };

/** Builds a share image (today's air for a city, or the user's own impact) with Web Share and a download fallback. */
export default function ShareCard({ city: initialCity, language }: { city: CityName; language: Language }) {
  const id = useId();
  const t = SHARE_STRINGS[language];
  const [kind, setKind] = useState<Kind>("today");
  const [city, setCity] = useState<CityName>(initialCity);
  const [period, setPeriod] = useState<CardPeriod>("week");
  const [numbers, setNumbers] = useState<WeeklyNumbers>({ trips: 0, km: 0, co2: 0, pm25: 0 });
  const [imageError, setImageError] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Your impact comes from this device's tracker, read fresh whenever the card type or period changes.
  useEffect(() => setNumbers(weeklyNumbers(readStored(TRACKER_STORAGE_KEY, TrackerStateSchema, EMPTY), period)), [kind, period]);

  const noTrips = kind === "weekly" && numbers.trips === 0;
  const url = kind === "today" ? todayCardUrl(city, language) : weeklyCardUrl(numbers, period, language);
  const alt = kind === "today" ? t.altToday(city) : t.altWeekly(`${Math.round(numbers.co2 * 10) / 10} kg`, numbers.trips);
  useEffect(() => setImageError(false), [url]);

  async function share() {
    setBusy(true);
    setMessage(t.preparing);
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "smogsense-card.png", { type: "image/png" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "SmogSense" });
        setMessage(t.shared);
      } else {
        saveFile(blob);
        setMessage("");
      }
    } catch (err) {
      setMessage(err instanceof DOMException && err.name === "AbortError" ? "" : t.shareFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id={`${id}-h`} className="text-xl font-semibold">{t.heading}</h2>
      <p className="mt-1 text-slate-800">{t.intro}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor={`${id}-kind`} className="block font-medium">{t.kind}</label>
          <select id={`${id}-kind`} className={field} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="today">{t.kinds.today}</option>
            <option value="weekly">{t.kinds.weekly}</option>
          </select>
        </div>
        {kind === "today" ? (
          <div>
            <label htmlFor={`${id}-city`} className="block font-medium">{t.city}</label>
            <select id={`${id}-city`} className={field} value={city} onChange={(e) => setCity(e.target.value as CityName)}>
              {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor={`${id}-period`} className="block font-medium">{t.period}</label>
            <select id={`${id}-period`} className={field} value={period} onChange={(e) => setPeriod(e.target.value as CardPeriod)}>
              {CARD_PERIODS.map((p) => <option key={p} value={p}>{t.periods[p]}</option>)}
            </select>
          </div>
        )}
      </div>

      {noTrips ? <p className="mt-4 rounded border border-slate-400 bg-slate-50 p-3">{t.noTrips}</p> : (
        <figure className="mt-4">
          <figcaption className="sr-only">{t.preview}</figcaption>
          {imageError ? (
            <p role="alert" className="rounded border border-red-800 bg-red-50 p-3 text-red-900">{t.imageFailed}</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- a generated PNG from our own API; next/image would only re-encode it
            <img src={url} alt={alt} width={CARD_WIDTH} height={CARD_HEIGHT} loading="lazy" onError={() => setImageError(true)} className="h-auto w-full rounded-lg border border-slate-300" />
          )}
        </figure>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={share} disabled={busy || noTrips || imageError} className={`${btn} border-blue-800 bg-blue-700 text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:border-slate-500 disabled:bg-slate-500`}>{t.share}</button>
        {noTrips || imageError ? null : <a href={url} download="smogsense-card.png" className={`${btn} inline-flex items-center border-blue-700 text-blue-800 hover:bg-blue-50`}>{t.download}</a>}
        <span aria-live="polite" className="text-sm font-medium">{message}</span>
      </div>
      <p className="mt-3 text-xs text-slate-700">{t.fallbackNote}</p>
      <p className="mt-1 text-xs text-slate-700">{t.privacyShown} {t.privacyNever}</p>
    </section>
  );
}

/** Saves a blob as a file (the fallback where the Web Share API cannot share files). */
function saveFile(blob: Blob): void {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "smogsense-card.png";
  a.click();
  URL.revokeObjectURL(href);
}
