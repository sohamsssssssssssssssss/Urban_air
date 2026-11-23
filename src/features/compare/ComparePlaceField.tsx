import { useId } from "react";
import { CITIES, type CityName } from "@/lib/cities";
import { ROUTE_PLACE_MAX_CHARS } from "@/lib/route/constants";
import type { Language } from "@/lib/i18n";
import type { PlaceChoice } from "./schema";
import { COMPARE_STRINGS } from "./strings";

const OTHER = "__other";
const field = "mt-1 block min-h-11 w-full rounded-md border border-slate-500 bg-white px-3 py-2";

export interface ComparePlaceFieldProps {
  n: 1 | 2;
  choice: PlaceChoice;
  onChange: (choice: PlaceChoice) => void;
  language: Language;
}

/** A city list with an "Another place…" option that reveals a text box. */
export default function ComparePlaceField({ n, choice, onChange, language }: ComparePlaceFieldProps) {
  const id = useId();
  const t = COMPARE_STRINGS[language];
  return (
    <div>
      <label htmlFor={`${id}-select`} className="block font-medium">{t.placeLabel(n)}</label>
      <select
        id={`${id}-select`} className={field} value={choice.kind === "city" ? choice.city : OTHER}
        onChange={(e) => onChange(e.target.value === OTHER ? { kind: "text", query: "" } : { kind: "city", city: e.target.value as CityName })}
      >
        {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        <option value={OTHER}>{t.other}</option>
      </select>
      {choice.kind === "text" && (
        <>
          <label htmlFor={`${id}-text`} className="mt-2 block font-medium">{t.otherLabel(n)}</label>
          <input
            id={`${id}-text`} className={field} value={choice.query} maxLength={ROUTE_PLACE_MAX_CHARS} autoComplete="off"
            aria-describedby={`${id}-hint`} onChange={(e) => onChange({ kind: "text", query: e.target.value })}
          />
          <p id={`${id}-hint`} className="mt-1 text-sm text-slate-700">{t.otherHint}</p>
        </>
      )}
    </div>
  );
}
