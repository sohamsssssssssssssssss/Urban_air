"use client";

import { useId, useState, type FormEvent } from "react";
import { CITIES, nearestCity, type CityName } from "@/lib/cities";
import { COMMUTE_MODES, MODE_LABEL, type CommuteMode } from "@/lib/commute";
import type { Language, Location, UserProfile } from "@/lib/profile";

const MAX_KM = 100;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const field = "mt-1 block min-h-11 w-full rounded-md border border-slate-500 bg-white px-3 py-2";
const checkRow = "flex min-h-11 items-center gap-3";
const box = "h-5 w-5 accent-blue-700";

export interface ProfileFormProps {
  onSubmit: (location: Location, profile: UserProfile, language: Language) => void;
  busy: boolean;
}

/** Onboarding form: location, household, commute, home and language. */
export default function ProfileForm({ onSubmit, busy }: ProfileFormProps) {
  const id = useId();
  const [city, setCity] = useState<CityName>("Delhi");
  const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  const [household, setHousehold] = useState({ kids: false, elderly: false, respiratory: false, pets: false });
  const [commuteMode, setCommuteMode] = useState<CommuteMode>("two_wheeler");
  const [km, setKm] = useState("10");
  const [kmError, setKmError] = useState("");
  const [workStartHour, setStart] = useState(9);
  const [workEndHour, setEnd] = useState(18);
  const [ownsPurifier, setOwnsPurifier] = useState(false);
  const [budget, setBudget] = useState<UserProfile["budget"]>("medium");
  const [language, setLanguage] = useState<Language>("en");

  function locate() {
    if (!("geolocation" in navigator)) return setGeoMsg("Location is not supported by this browser. Please pick a city.");
    setGeoMsg("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const near = nearestCity(coords.latitude, coords.longitude);
        setGeo({ lat: coords.latitude, lon: coords.longitude });
        setCity(near.name);
        setGeoMsg(`Using your current location (nearest listed city: ${near.name}).`);
      },
      () => setGeoMsg("Couldn't get your location. Please pick a city instead."),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const commuteKm = Number(km);
    if (km.trim() === "" || !Number.isFinite(commuteKm) || commuteKm < 0 || commuteKm > MAX_KM) {
      setKmError(`Enter a distance between 0 and ${MAX_KM} km.`);
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
    <section aria-labelledby={`${id}-h`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id={`${id}-h`} className="text-xl font-semibold">Your household</h2>
      <form onSubmit={submit} noValidate className="mt-4 grid gap-6 md:grid-cols-2">
        <fieldset>
          <legend className="font-semibold">Location</legend>
          <label htmlFor={`${id}-city`} className="mt-2 block">City</label>
          <select id={`${id}-city`} className={field} value={city} onChange={(e) => { setCity(e.target.value as CityName); setGeo(null); setGeoMsg(""); }}>
            {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <button type="button" onClick={locate} className="mt-2 min-h-11 rounded-md border border-blue-700 px-4 py-2 font-medium text-blue-800 hover:bg-blue-50">
            Use my current location
          </button>
          <p aria-live="polite" className="mt-1 text-sm text-slate-700">{geoMsg}</p>
        </fieldset>

        <fieldset>
          <legend className="font-semibold">Who lives with you?</legend>
          {([["kids", "Children"], ["elderly", "Elderly family members"], ["respiratory", "Someone with asthma or other breathing sensitivity"], ["pets", "Pets"]] as const).map(([key, label]) => (
            <label key={key} className={checkRow}>
              <input type="checkbox" className={box} checked={household[key]} onChange={() => toggle(key)} />
              {label}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend className="font-semibold">Daily commute</legend>
          <label htmlFor={`${id}-mode`} className="mt-2 block">Usual mode</label>
          <select id={`${id}-mode`} className={field} value={commuteMode} onChange={(e) => setCommuteMode(e.target.value as CommuteMode)}>
            {COMMUTE_MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m][0]?.toUpperCase() + MODE_LABEL[m].slice(1)}</option>)}
          </select>
          <label htmlFor={`${id}-km`} className="mt-3 block">One-way distance (km)</label>
          <input
            id={`${id}-km`} type="number" inputMode="decimal" min={0} max={MAX_KM} step="0.5" className={field} value={km}
            onChange={(e) => setKm(e.target.value)} aria-invalid={kmError ? true : undefined} aria-describedby={kmError ? `${id}-km-err` : `${id}-km-hint`}
          />
          {kmError ? <p id={`${id}-km-err`} className="mt-1 text-sm font-medium text-red-800">{kmError}</p> : <p id={`${id}-km-hint`} className="mt-1 text-sm text-slate-700">Use 0 if you work from home.</p>}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-start`} className="block">Work starts</label>
              <select id={`${id}-start`} className={field} value={workStartHour} onChange={(e) => setStart(Number(e.target.value))}>
                {HOURS.map((h) => <option key={h} value={h}>{`${h}:00`}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-end`} className="block">Work ends</label>
              <select id={`${id}-end`} className={field} value={workEndHour} onChange={(e) => setEnd(Number(e.target.value))}>
                {HOURS.map((h) => <option key={h} value={h}>{`${h}:00`}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        <div className="grid gap-6">
          <fieldset>
            <legend className="font-semibold">Home</legend>
            <label className={checkRow}>
              <input type="checkbox" className={box} checked={ownsPurifier} onChange={() => setOwnsPurifier((v) => !v)} />
              I own an air purifier
            </label>
            <p id={`${id}-budget-l`} className="mt-2">Budget for air-quality upgrades</p>
            <div role="radiogroup" aria-labelledby={`${id}-budget-l`} className="flex flex-wrap gap-x-6">
              {(["low", "medium", "high"] as const).map((b) => (
                <label key={b} className={checkRow}>
                  <input type="radio" name={`${id}-budget`} className={box} checked={budget === b} onChange={() => setBudget(b)} />
                  {b[0]?.toUpperCase() + b.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-semibold">Advice language</legend>
            <div className="flex gap-6">
              <label className={checkRow}>
                <input type="radio" name={`${id}-lang`} className={box} checked={language === "en"} onChange={() => setLanguage("en")} />
                English
              </label>
              <label className={checkRow} lang="hi">
                <input type="radio" name={`${id}-lang`} className={box} checked={language === "hi"} onChange={() => setLanguage("hi")} />
                हिन्दी
              </label>
            </div>
          </fieldset>
        </div>

        <div className="md:col-span-2">
          <button type="submit" disabled={busy} className="min-h-11 rounded-md bg-blue-700 px-6 py-2 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-500">
            {busy ? "Getting your plan…" : "Get my plan"}
          </button>
        </div>
      </form>
    </section>
  );
}
