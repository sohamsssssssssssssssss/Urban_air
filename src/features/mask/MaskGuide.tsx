import type { AqiCategory, AQSnapshot } from "@/lib/aq/types";
import { CATEGORY_LABEL, type Language } from "@/lib/i18n";
import type { UserProfile } from "@/lib/profile";
import { MASK_SOURCE, NIOSH_SOURCE } from "./constants";
import { MASK_ACTIVITIES, maskFor } from "./logic";
import { MASK_STRINGS } from "./strings";

/** Lowest AQI of each CPCB band, used to fill the reference table. */
const BAND_START: ReadonlyArray<[AqiCategory, number]> = [["Good", 0], ["Satisfactory", 51], ["Moderate", 101], ["Poor", 201], ["Very Poor", 301], ["Severe", 401]];

export interface MaskGuideProps {
  snapshot: AQSnapshot;
  profile: UserProfile;
  language: Language;
}

/** What to wear now (by activity, for this household) plus an AQI-band reference, fit tips and sources. */
export default function MaskGuide({ snapshot, profile, language }: MaskGuideProps) {
  const t = MASK_STRINGS[language];
  const sensitive = profile.kids || profile.elderly || profile.respiratory;
  const now = MASK_ACTIVITIES.map((activity) => ({ activity, ...maskFor({ aqi: snapshot.aqi, activity, sensitive, child: profile.kids }) }));
  const level = (aqi: number, activity: "commute" | "exertion", s: boolean) => t.level[maskFor({ aqi, activity, sensitive: s, child: false }).level];

  return (
    <section aria-labelledby="mask-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id="mask-heading" className="text-xl font-semibold">{t.heading}</h2>
      <p className="mt-1 text-slate-800">{t.intro(snapshot.aqi, CATEGORY_LABEL[language][snapshot.category])}</p>
      <table className="mt-3 w-full text-left text-sm">
        <thead><tr className="border-b border-slate-300"><th scope="col" className="py-1 pr-3">{t.colActivity}</th><th scope="col" className="py-1">{t.colAdvice}</th></tr></thead>
        <tbody>
          {now.map((a) => (
            <tr key={a.activity} className="border-b border-slate-100 align-top">
              <th scope="row" className="py-1 pr-3 font-medium">{t.activity[a.activity]}</th>
              <td className="py-1">{t.level[a.level]}{a.avoidExertion ? ` ${t.avoidExertion}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {now.some((a) => a.childNote) && <p className="mt-3 rounded border border-amber-700 bg-amber-50 p-3 text-sm text-amber-900">{t.childNote}</p>}
      <p className="mt-3 text-sm text-slate-800">{t.notEffective}</p>

      <h3 className="mt-4 font-semibold">{t.fitHeading}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{t.fitTips.map((tip) => <li key={tip}>{tip}</li>)}</ul>

      <table className="mt-4 w-full text-left text-sm">
        <caption className="mb-1 text-left font-semibold">{t.bandsCaption}</caption>
        <thead>
          <tr className="border-b border-slate-300">
            {[t.colBand, t.colCommute, t.colSensitive, t.colExercise].map((h) => <th key={h} scope="col" className="py-1 pr-3">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {BAND_START.map(([band, aqi]) => (
            <tr key={band} className="border-b border-slate-100 align-top">
              <th scope="row" className="py-1 pr-3 font-medium">{CATEGORY_LABEL[language][band]}</th>
              <td className="py-1 pr-3">{level(aqi, "commute", false)}</td>
              <td className="py-1 pr-3">{level(aqi, "commute", true)}</td>
              <td className="py-1">{level(aqi, "exertion", false)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-xs text-slate-700">{t.disclaimer}</p>
      <p className="mt-1 text-xs text-slate-700">
        {t.sourceLead}{" "}
        <a className="underline" href={MASK_SOURCE.url} rel="noopener noreferrer">{MASK_SOURCE.org}, {MASK_SOURCE.title} ({MASK_SOURCE.date})</a>;{" "}
        <a className="underline" href={NIOSH_SOURCE.url} rel="noopener noreferrer">{NIOSH_SOURCE.org}</a>.
      </p>
    </section>
  );
}
