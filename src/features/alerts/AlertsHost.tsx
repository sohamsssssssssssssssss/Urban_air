"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Language } from "@/lib/i18n";
import type { Location } from "@/lib/profile";
import { useStoredState } from "../shared/useStoredState";
import AlertBanner from "./AlertBanner";
import AlertPanel from "./AlertPanel";
import { ALERTS_STORAGE_KEY } from "./constants";
import { AlertSettingsSchema, type AlertSettings } from "./schema";
import { useAirAlerts } from "./useAirAlerts";

export const ALERT_PANEL_SLOT_ID = "alert-panel-slot";

/**
 * Runs the air alerts for the whole app (so they keep working on every section) and shows the in-app banner at the top.
 * The settings panel is rendered into the slot in "Me" once that section has been opened.
 */
export default function AlertsHost({ location, language, meOpened }: { location: Location; language: Language; meOpened: boolean }) {
  const initial: AlertSettings = { enabled: false, threshold: 201, city: location.city ?? "Delhi", lastNotified: null };
  const [settings, setSettings] = useStoredState(ALERTS_STORAGE_KEY, AlertSettingsSchema, initial);
  const save = (next: Partial<AlertSettings>) => setSettings((s) => ({ ...s, ...next }));
  const state = useAirAlerts(settings, save, language);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => setSlot(document.getElementById(ALERT_PANEL_SLOT_ID)), [meOpened]);
  const readingKey = state.snapshot ? `${state.snapshot.station.id}|${state.snapshot.measuredAt}` : null;

  return (
    <>
      {settings.enabled && state.above && state.snapshot && dismissed !== readingKey && (
        <AlertBanner snapshot={state.snapshot} city={settings.city} threshold={settings.threshold} language={language} onDismiss={() => setDismissed(readingKey)} />
      )}
      {slot && createPortal(<AlertPanel settings={settings} save={save} state={state} language={language} />, slot)}
    </>
  );
}
