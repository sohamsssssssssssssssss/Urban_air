"use client";

import { useId, useState, type FormEvent } from "react";
import { CITIES, nearestCity, type CityName } from "@/lib/cities";
import { COMMUTE_MODES, type CommuteMode } from "@/lib/commute";
import { MODE_NAME, UI, type Language } from "@/lib/i18n";
import type { Location, UserProfile } from "@/lib/profile";
import Section from "@/components/ui/Section";

const MAX_KM = 100;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const field = "mt-1 block min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 py-2";
const checkRow = "flex min-h-11 items-center gap-3";
const box = "h-5 w-5 accent-brand";

export interface ProfileFormProps {
  onSubmit: (location: Location, profile: UserProfile, language: Language) => void;
  busy: boolean;
  language: Language;
  onLanguageChange: (language: Language) => void;
  /** Saved values to start from (the form is in "Me" after onboarding). */
  initial?: { location: Location; profile: UserProfile };
}

/** Onboarding form: location, household, commute, home and language. */
export default function ProfileForm({ onSubmit, busy, language, onLanguageChange, initial }: ProfileFormProps) {
  const id = useId();
  const t = UI[language].form;
  const p0 = initial?.profile;
  const [city, setCity] = useState<CityName>(initial?.location.city ?? "Delhi");
  const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  const [household, setHousehold] = useState({ kids: p0?.kids ?? false, elderly: p0?.elderly ?? false, respiratory: p0?.respiratory ?? false, pets: p0?.pets ?? false });
  const [commuteMode, setCommuteMode] = useState<CommuteMode>(p0?.commuteMode ?? "two_wheeler");
  const [km, setKm] = useState(String(p0?.commuteKm ?? 10));
  const [kmError, setKmError] = useState("");
  const [workStartHour, setStart] = useState(p0?.workStartHour ?? 9);
  const [workEndHour, setEnd] = useState(p0?.workEndHour ?? 18);
  const [ownsPurifier, setOwnsPurifier] = useState(p0?.ownsPurifier ?? false);
  const [budget, setBudget] = useState<UserProfile["budget"]>(p0?.budget ?? "medium");

  function locate() {
    if (!("geolocation" in navigator)) return setGeoMsg(t.geoUnsupported);
    setGeoMsg(t.locating);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const near = nearestCity(coords.latitude, coords.longitude);
        setGeo({ lat: coords.latitude, lon: coords.longitude });
        setCity(near.name);
        setGeoMsg(t.geoUsing(near.name));
      },
      () => setGeoMsg(t.geoFailed),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const commuteKm = Number(km);
    if (km.trim() === "" || !Number.isFinite(commuteKm) || commuteKm < 0 || commuteKm > MAX_KM) {
      setKmError(t.kmError(MAX_KM));
      document.getElementById(`${id}-km`)?.focus();
      return;
    }
    setKmError("");
    const c = CITIES.find((x) => x.name === city) ?? CITIES[0];
    const location: Location = geo ? { ...geo, city } : { lat: c.lat, lon: c.lon, city };
    onSubmit(location, { ...household, commuteMode, commuteKm, workStartHour, workEndHour, ownsPurifier, budget }, language);
  }

  const toggle = (key: keyof typeof household) => setHousehold((h) => ({ ...h, [key]: !h[key] }));

  return (
    <Section title={t.heading}>
      <form onSubmit={submit} noValidate className="mt-4 grid gap-6 md:grid-cols-2">
        <fieldset>
          <legend className="font-semibold">{t.location}</legend>
          <label htmlFor={`${id}-city`} className="mt-2 block">{t.city}</label>
          <select id={`${id}-city`} className={field} value={city} onChange={(e) => { setCity(e.target.value as CityName); setGeo(null); setGeoMsg(""); }}>
            {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <button type="button" onClick={locate} className="mt-2 min-h-11 rounded-control border border-brand px-4 py-2 font-medium text-brand-text hover:bg-brand-soft">
            {t.useLocation}
          </button>
          <p aria-live="polite" className="mt-1 text-sm text-ink-muted">{geoMsg}</p>
        </fieldset>

        <fieldset>
          <legend className="font-semibold">{t.household}</legend>
          {(["kids", "elderly", "respiratory", "pets"] as const).map((key) => (
            <label key={key} className={checkRow}>
              <input type="checkbox" className={box} checked={household[key]} onChange={() => toggle(key)} />
              {t[key]}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend className="font-semibold">{t.commute}</legend>
          <label htmlFor={`${id}-mode`} className="mt-2 block">{t.mode}</label>
          <select id={`${id}-mode`} className={field} value={commuteMode} onChange={(e) => setCommuteMode(e.target.value as CommuteMode)}>
            {COMMUTE_MODES.map((m) => <option key={m} value={m}>{MODE_NAME[language][m][0]?.toUpperCase() + MODE_NAME[language][m].slice(1)}</option>)}
          </select>
          <label htmlFor={`${id}-km`} className="mt-3 block">{t.km}</label>
          <input
            id={`${id}-km`} type="number" inputMode="decimal" min={0} max={MAX_KM} step="0.5" className={field} value={km}
            onChange={(e) => setKm(e.target.value)} aria-invalid={kmError ? true : undefined} aria-describedby={kmError ? `${id}-km-err` : `${id}-km-hint`}
          />
          {kmError ? <p id={`${id}-km-err`} className="mt-1 text-sm font-medium text-danger-text">{kmError}</p> : <p id={`${id}-km-hint`} className="mt-1 text-sm text-ink-muted">{t.kmHint}</p>}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-start`} className="block">{t.workStart}</label>
              <select id={`${id}-start`} className={field} value={workStartHour} onChange={(e) => setStart(Number(e.target.value))}>
                {HOURS.map((h) => <option key={h} value={h}>{`${h}:00`}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-end`} className="block">{t.workEnd}</label>
              <select id={`${id}-end`} className={field} value={workEndHour} onChange={(e) => setEnd(Number(e.target.value))}>
                {HOURS.map((h) => <option key={h} value={h}>{`${h}:00`}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        <div className="grid gap-6">
          <fieldset>
            <legend className="font-semibold">{t.home}</legend>
            <label className={checkRow}>
              <input type="checkbox" className={box} checked={ownsPurifier} onChange={() => setOwnsPurifier((v) => !v)} />
              {t.purifier}
            </label>
            <p id={`${id}-budget-l`} className="mt-2">{t.budget}</p>
            <div role="radiogroup" aria-labelledby={`${id}-budget-l`} className="flex flex-wrap gap-x-6">
              {(["low", "medium", "high"] as const).map((b) => (
                <label key={b} className={checkRow}>
                  <input type="radio" name={`${id}-budget`} className={box} checked={budget === b} onChange={() => setBudget(b)} />
                  {t.budgets[b]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-semibold">{t.language}</legend>
            <div className="flex gap-6">
              <label className={checkRow} lang="en">
                <input type="radio" name={`${id}-lang`} className={box} checked={language === "en"} onChange={() => onLanguageChange("en")} />
                English
              </label>
              <label className={checkRow} lang="hi">
                <input type="radio" name={`${id}-lang`} className={box} checked={language === "hi"} onChange={() => onLanguageChange("hi")} />
                हिन्दी
              </label>
            </div>
          </fieldset>
        </div>

        <div className="md:col-span-2">
          <button type="submit" disabled={busy} className="min-h-11 rounded-control bg-brand px-6 py-2 font-semibold text-brand-ink hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted disabled:border-line">
            {busy ? t.submitting : t.submit}
          </button>
        </div>
      </form>
    </Section>
  );
}
