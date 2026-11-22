import type { AqiCategory } from "@/lib/aq/types";

/** Distinct shape per category so meaning never depends on colour alone. Decorative: text label is always shown. */
export default function CategoryIcon({ category }: { category: AqiCategory }) {
  const common = { width: 28, height: 28, viewBox: "0 0 24 24", "aria-hidden": true, focusable: false, fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;
  switch (category) {
    case "Good":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>;
    case "Satisfactory":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>;
    case "Moderate":
      return <svg {...common}><path d="M12 3l9 16H3z" /><path d="M12 10v4" /></svg>;
    case "Poor":
      return <svg {...common}><path d="M12 3l9 16H3z" /><path d="M12 9v5M12 17h.01" /></svg>;
    case "Very Poor":
      return <svg {...common}><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" /><path d="M12 8v5M12 16h.01" /></svg>;
    case "Severe":
      return <svg {...common}><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" /><path d="M9 9l6 6M15 9l-6 6" /></svg>;
  }
}
