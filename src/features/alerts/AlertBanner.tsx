import { createPortal } from "react-dom";
import { formatIST } from "@/lib/format";
import { CATEGORY_LABEL, type Language } from "@/lib/i18n";
import type { AQSnapshot } from "@/lib/aq/types";
import { ALERT_STRINGS } from "./strings";

export const ALERT_SLOT_ID = "alert-slot";

export interface AlertBannerProps {
  snapshot: AQSnapshot;
  city: string;
  threshold: number;
  language: Language;
  onDismiss: () => void;
}

/**
 * The in-app alert. It is rendered into the empty `#alert-slot` at the top of the page (so it is seen without scrolling)
 * and is deliberately static: no animation, so it needs no reduced-motion variant.
 */
export default function AlertBanner({ snapshot, city, threshold, language, onDismiss }: AlertBannerProps) {
  const t = ALERT_STRINGS[language];
  const slot = typeof document === "undefined" ? null : document.getElementById(ALERT_SLOT_ID);
  const banner = (
    <div role="alert" className="flex flex-wrap items-start justify-between gap-3 rounded-xl border-2 border-danger bg-danger-soft p-4 text-danger-text">
      <div>
        <p className="font-bold">{t.bannerTitle({ aqi: snapshot.aqi, category: CATEGORY_LABEL[language][snapshot.category], city })}</p>
        <p className="text-sm">{t.bannerBody({ threshold, station: snapshot.station.name, time: formatIST(snapshot.measuredAt) })}</p>
      </div>
      <button type="button" onClick={onDismiss} className="min-h-11 rounded-md border border-danger px-4 py-2 font-medium hover:bg-danger-soft">{t.dismiss}</button>
    </div>
  );
  return slot ? createPortal(banner, slot) : banner;
}
