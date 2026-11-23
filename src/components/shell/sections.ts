/** The five app sections. Each has its own URL hash (#today, #plan, ...), so it can be deep-linked and the back button works. */
export const SECTIONS = ["today", "plan", "routes", "outlook", "me"] as const;
export type SectionId = (typeof SECTIONS)[number];
export const DEFAULT_SECTION: SectionId = "today";

/** "#plan" -> "plan"; anything else (empty, unknown, "#main" from the skip link) -> null. */
export function sectionFromHash(hash: string): SectionId | null {
  const id = hash.replace(/^#/, "");
  return (SECTIONS as readonly string[]).includes(id) ? (id as SectionId) : null;
}
