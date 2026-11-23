/**
 * The first percentage in an impact sentence ("62% less PM2.5...", "Cuts ... by about 80%..."), for the inline bar.
 * Presentation only: the bar is decorative and the sentence, written by deterministic code, always carries the number.
 * @returns 0-100, or undefined when the sentence has no percentage
 */
export function impactPercent(impact: string): number | undefined {
  const m = /(\d{1,3}(?:\.\d+)?)\s?%/.exec(impact);
  const value = m ? Number(m[1]) : undefined;
  return value !== undefined && value <= 100 ? value : undefined;
}
