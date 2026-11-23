import type { Language } from "@/lib/i18n";
import { extremes, formatWhen, type ForecastHour, type ForecastWindow } from "./logic";
import { OUTLOOK_STRINGS } from "./strings";

const W = 640;
const H = 200;
const PAD = { left: 44, right: 8, top: 12, bottom: 24 };

/** Line chart of forecast PM2.5 with the cleanest windows shaded and numbered. Meaning never relies on colour alone. */
export default function OutlookChart({ hours, windows, language }: { hours: ForecastHour[]; windows: ForecastWindow[]; language: Language }) {
  const t = OUTLOOK_STRINGS[language];
  const ext = extremes(hours);
  if (!ext) return null;
  const top = Math.max(10, Math.ceil((ext.peak.pm25 ?? 1) / 10) * 10);
  const x = (i: number) => PAD.left + (i / Math.max(1, hours.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => H - PAD.bottom - (v / top) * (H - PAD.top - PAD.bottom);
  const points = hours.flatMap((h, i) => (h.pm25 === null ? [] : [`${x(i).toFixed(1)},${y(h.pm25).toFixed(1)}`])).join(" ");
  const index = (iso: string) => hours.findIndex((h) => h.at === iso);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="outlook-chart-title" aria-describedby="outlook-chart-desc" className="mt-3 h-auto w-full">
      <title id="outlook-chart-title">{t.chartTitle}</title>
      <desc id="outlook-chart-desc">{t.chartDesc({ peakWhen: formatWhen(ext.peak.at, language), peak: Math.round(ext.peak.pm25 ?? 0), lowWhen: formatWhen(ext.low.at, language), low: Math.round(ext.low.pm25 ?? 0) })}</desc>
      <g stroke="#475569" strokeWidth="1">
        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} />
      </g>
      <g fontSize="11" fill="#1e293b">
        <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end">{top}</text>
        <text x={PAD.left - 6} y={H - PAD.bottom + 4} textAnchor="end">0</text>
        <text x={4} y={PAD.top - 2}>{t.yAxis}</text>
      </g>
      {windows.map((w) => {
        const a = index(w.start);
        const b = index(w.end) === -1 ? hours.length - 1 : index(w.end);
        return a === -1 ? null : (
          <g key={w.rank}>
            <rect x={x(a)} y={PAD.top} width={Math.max(2, x(b) - x(a))} height={H - PAD.top - PAD.bottom} fill="#bbf7d0" stroke="#166534" strokeDasharray="4 2" />
            <text x={(x(a) + x(b)) / 2} y={PAD.top + 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="#14532d">{w.rank}</text>
          </g>
        );
      })}
      <polyline points={points} fill="none" stroke="#1e3a8a" strokeWidth="2" />
      <g fontSize="11" fill="#1e293b" textAnchor="middle">
        {hours.map((h, i) => (new Date(Date.parse(h.at) + 330 * 60_000).getUTCHours() === 0 ? <text key={h.at} x={x(i)} y={H - 6}>{formatWhen(h.at, language).split(",")[0]}</text> : null))}
      </g>
    </svg>
  );
}
