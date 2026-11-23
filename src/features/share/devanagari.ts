const I_MATRA = "ि"; // ि, drawn to the LEFT of its consonant cluster but typed after it
const VIRAMA = "्";
const NUKTA = "़";

const isConsonant = (ch: string) => {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 0x0915 && c <= 0x0939) || (c >= 0x0958 && c <= 0x095f);
};

/**
 * Puts Devanagari text into visual order for a renderer that does not reorder (Satori, used by next/og).
 * Hindi types the short-i sign "ि" after its consonant (or conjunct), but it is drawn before it; a shaping engine
 * moves it, Satori does not, so "फिट" would draw as "फटि". This moves each "ि" to the start of its consonant cluster.
 * Everything else is left alone (the font still draws other signs correctly).
 * Used only for text drawn onto images; on-page text goes through the browser's own shaping.
 */
export function toVisualOrder(text: string): string {
  const out: string[] = [];
  let clusterStart = -1;
  let previous = "";
  for (const ch of text) {
    if (isConsonant(ch)) {
      // a consonant right after a virama continues the conjunct; otherwise it starts a new cluster
      if (previous !== VIRAMA) clusterStart = out.length;
      out.push(ch);
    } else if (ch === I_MATRA && clusterStart >= 0) {
      out.splice(clusterStart, 0, ch);
    } else {
      if (ch !== NUKTA && ch !== VIRAMA && ch !== I_MATRA) clusterStart = -1;
      out.push(ch);
    }
    previous = ch;
  }
  return out.join("");
}
