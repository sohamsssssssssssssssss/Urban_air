"use client";

import { useId, useState, type FormEvent } from "react";
import { CITIES, nearestCity, type CityName } from "@/lib/cities";
import { UI, type Language } from "@/lib/i18n";
import { SHELL } from "@/lib/i18n.shell";
import type { Location, UserProfile } from "@/lib/profile";
import { buttonClass } from "../ui/button";
import Section from "../ui/Section";

const field = "mt-1 block min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 py-2";
const HOUSEHOLD = ["kids", "elderly", "respiratory", "pets"] as const;
/** Everything the short onboarding does not ask; refined later in Me. */
const DEFAULTS = { commuteMode: "two_wheeler", commuteKm: 10, workStartHour: 9, workEndHour: 18, ownsPurifier: false, budget: "medium" } as const;

export interface OnboardingProps {
  language: Language;
  onSubmit: (location: Location, profile: UserProfile, language: Language) => void;
}

/** First visit: three quick questions (city, household), then the live air. Everything else has sensible defaults. */
export default function Onboarding({ language, onSubmit }: OnboardingProps) {
  const id = useId();
  const t = SHELL[language].onboarding;
  const f = UI[language].form;
  const [city, setCity] = useState<CityName>("Delhi");
  const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  const [household, setHousehold] = useState({ kids: false, elderly: false, respiratory: false, pets: false });

  function locate() {
    if (!("geolocation" in navigator)) return setGeoMsg(f.geoUnsupported);
    setGeoMsg(f.locating);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const near = nearestCity(coords.latitude, coords.longitude);
        setGeo({ lat: coords.latitude, lon: coords.longitude });
        setCity(near.name);
        setGeoMsg(f.geoUsing(near.name));
      },
      () => setGeoMsg(f.geoFailed),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const c = CITIES.find((x) => x.name === city) ?? CITIES[0];
    onSubmit(geo ? { ...geo, city } : { lat: c.lat, lon: c.lon, city }, { ...household, ...DEFAULTS }, language);
  }

  return (
    <Section title={t.title} description={t.intro} className="mx-auto max-w-2xl">
      <form onSubmit={submit} className="mt-5 grid gap-6">
        <div>
          <label htmlFor={`${id}-city`} className="block font-bold">{t.city}</label>
          <select id={`${id}-city`} className={field} value={city} onChange={(e) => { setCity(e.target.value as CityName); setGeo(null); setGeoMsg(""); }}>
            {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <button type="button" onClick={locate} className={buttonClass("outline", "mt-2")}>{f.useLocation}</button>
          <p aria-live="polite" className="mt-1 min-h-5 text-sm text-ink-muted">{geoMsg}</p>
        </div>
        <fieldset>
          <legend className="font-bold">{t.household}</legend>
          <p className="text-sm text-ink-muted">{t.householdHint}</p>
          {HOUSEHOLD.map((key) => (
            <label key={key} className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-brand" checked={household[key]} onChange={() => setHousehold((h) => ({ ...h, [key]: !h[key] }))} />
              {t[key]}
            </label>
          ))}
        </fieldset>
        <div>
          <button type="submit" className={buttonClass("primary", "w-full sm:w-auto")}>{t.submit}</button>
          <p className="mt-3 text-sm text-ink-muted">{t.refine}</p>
        </div>
      </form>
    </Section>
  );
}
