const DEVANAGARI_ZERO = 0x0966;
const MIN_CHECKED = 10;

/** Extracts numbers (≥ 10 or with decimals) as canonical strings; Devanagari digits normalised. */
export function extractNumbers(text: string): string[] {
  const ascii = text.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - DEVANAGARI_ZERO));
  const matches = ascii.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  return matches
    .map((m) => Number(m.replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && (n >= MIN_CHECKED || !Number.isInteger(n)))
    .map(String);
}

/**
 * Hallucination guard: returns numbers in `output` that never appear in `source`.
 * Small integers (< 10) are ignored because they occur naturally in prose.
 * @param output - model-written text
 * @param source - the grounded context the model was given
 */
export function ungroundedNumbers(output: string, source: string): string[] {
  const allowed = new Set(extractNumbers(source));
  return extractNumbers(output).filter((n) => !allowed.has(n));
}
