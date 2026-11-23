"use client";

import { useEffect, useId, useState } from "react";
import { CITIES, type CityName } from "@/lib/cities";
import type { Language } from "@/lib/i18n";
import { formatIST } from "@/lib/format";
import type { Location } from "@/lib/profile";
import { useStoredState } from "../shared/useStoredState";
import AlertBanner from "./AlertBanner";
import { ALERTS_STORAGE_KEY, ALERT_THRESHOLDS, type AlertThreshold } from "./constants";
import { permissionState, registerServiceWorker, requestPermission, type PermissionState } from "./notify";
import { AlertSettingsSchema, type AlertSettings } from "./schema";
import { ALERT_STRINGS } from "./strings";
import { useAirAlerts } from "./useAirAlerts";

const field = "mt-1 block min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 py-2";

/** Alert settings, the honest "only while open" limit, an explicit permission button, and the in-app banner. */
export default function AlertPanel({ location, language }: { location: Location; language: Language }) {
  const id = useId();
  const t = ALERT_STRINGS[language];
  const initial: AlertSettings = { enabled: false, threshold: 201, city: location.city ?? "Delhi", lastNotified: null };
  const [settings, setSettings] = useStoredState(ALERTS_STORAGE_KEY, AlertSettingsSchema, initial);
  const save = (next: Partial<AlertSettings>) => setSettings((s) => ({ ...s, ...next }));
  const state = useAirAlerts(settings, save, language);
  const [permission, setPermission] = useState<PermissionState>("default");
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => setPermission(permissionState()), []);
  const readingKey = state.snapshot ? `${state.snapshot.station.id}|${state.snapshot.measuredAt}` : null;

  async function allow() {
    // Only ever called from this button: SmogSense never asks for permission on load.
    const result = await requestPermission();
    setPermission(result);
    if (result === "granted") await registerServiceWorker();
  }

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 id={`${id}-h`} className="text-xl font-semibold">{t.heading}</h2>
      <p className="mt-1 rounded border border-warn bg-warn-soft p-3 text-sm font-medium text-warn-text">{t.limit}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor={`${id}-city`} className="block font-medium">{t.city}</label>
          <select id={`${id}-city`} className={field} value={settings.city} onChange={(e) => save({ city: e.target.value as CityName, lastNotified: null })}>
            {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-level`} className="block font-medium">{t.threshold}</label>
          <select id={`${id}-level`} className={field} value={settings.threshold} onChange={(e) => save({ threshold: Number(e.target.value) as AlertThreshold, lastNotified: null })}>
            {ALERT_THRESHOLDS.map((v) => <option key={v} value={v}>{t.thresholds[v]}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {/* constant label + aria-pressed: the name must not change with the state */}
        <button type="button" aria-pressed={settings.enabled} onClick={() => save({ enabled: !settings.enabled, lastNotified: null })} className={`min-h-11 rounded-md border px-5 py-2 font-semibold ${settings.enabled ? "border-brand bg-brand text-brand-ink" : "border-line-strong text-ink"}`}>
          {t.inApp}
        </button>
        <span className="font-semibold">{settings.enabled ? t.on : t.off}</span>
      </div>
      <p aria-live="polite" className="mt-2 text-sm text-ink">
        {!settings.enabled ? "" : state.failed ? t.checkFailed : state.snapshot && state.checkedAt ? t.status(formatIST(new Date(state.checkedAt).toISOString()), state.snapshot.aqi) : t.checking}
      </p>

      <div className="mt-4">
        <p className="font-medium">{t.browser}</p>
        <p className="mt-1 text-sm text-ink">{t.permission[permission]}</p>
        {permission === "default" && <button type="button" onClick={allow} className="mt-2 min-h-11 rounded-md border border-brand px-4 py-2 font-medium text-brand-text hover:bg-brand-soft">{t.allow}</button>}
      </div>
      <p className="mt-3 text-xs text-ink-muted">{t.install}</p>

      {settings.enabled && state.above && state.snapshot && dismissed !== readingKey && (
        <AlertBanner snapshot={state.snapshot} city={settings.city} threshold={settings.threshold} language={language} onDismiss={() => setDismissed(readingKey)} />
      )}
    </section>
  );
}
