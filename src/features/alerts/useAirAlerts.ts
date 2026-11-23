"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAir } from "@/components/apiClient";
import { CITIES } from "@/lib/cities";
import { CATEGORY_LABEL, type Language } from "@/lib/i18n";
import { formatIST } from "@/lib/format";
import type { AQSnapshot } from "@/lib/aq/types";
import { ALERT_POLL_MS } from "./constants";
import { evaluateReading } from "./logic";
import { showNotification } from "./notify";
import type { AlertSettings } from "./schema";
import { ALERT_STRINGS } from "./strings";

export interface AlertState {
  /** Latest reading for the watched city (null before the first check). */
  snapshot: AQSnapshot | null;
  checkedAt: number | null;
  failed: boolean;
  /** The reading is at or above the threshold. */
  above: boolean;
}

const INITIAL: AlertState = { snapshot: null, checkedAt: null, failed: false, above: false };

/**
 * While alerts are on and the page is open: checks the live AQI now, every 30 minutes, and when the tab becomes
 * visible again after a long gap (timers pause in sleeping tabs). Notifies once per crossing, band increase or cooldown.
 * Nothing runs when the page is closed: there is no background push.
 */
export function useAirAlerts(settings: AlertSettings, save: (next: Partial<AlertSettings>) => void, language: Language): AlertState {
  const [state, setState] = useState<AlertState>(INITIAL);
  const latest = useRef({ settings, language, save });
  latest.current = { settings, language, save };
  const lastCheck = useRef(0);

  const { enabled, city, threshold } = settings;
  useEffect(() => {
    if (!enabled) return setState(INITIAL);
    let cancelled = false;
    const place = CITIES.find((c) => c.name === city) ?? CITIES[0];

    async function check() {
      lastCheck.current = Date.now();
      try {
        const snapshot = await fetchAir({ lat: place.lat, lon: place.lon, city: place.name });
        if (cancelled) return;
        const now = Date.now();
        const { settings: current, language: lang, save: persist } = latest.current;
        const result = evaluateReading(current, snapshot.aqi, now);
        setState({ snapshot, checkedAt: now, failed: false, above: result.above });
        if (JSON.stringify(result.lastNotified) !== JSON.stringify(current.lastNotified)) persist({ lastNotified: result.lastNotified });
        if (result.notify) {
          const t = ALERT_STRINGS[lang];
          const category = CATEGORY_LABEL[lang][snapshot.category];
          await showNotification(t.notificationTitle({ aqi: snapshot.aqi, category, city: place.name }), t.bannerBody({ threshold: current.threshold, station: snapshot.station.name, time: formatIST(snapshot.measuredAt) }), `smogsense-${place.name}`);
        }
      } catch {
        if (!cancelled) setState((s) => ({ ...s, failed: true }));
      }
    }

    void check();
    const timer = setInterval(() => void check(), ALERT_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastCheck.current >= ALERT_POLL_MS) void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, city, threshold]);

  return state;
}
