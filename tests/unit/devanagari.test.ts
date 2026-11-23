import { describe, expect, it } from "vitest";
import { toVisualOrder } from "@/features/share/devanagari";

describe("toVisualOrder (the renderer does not reorder the short-i sign)", () => {
  it.each([
    ["फिट", "ि" + "फट"],
    ["किया", "ि" + "कया"],
    ["डिवाइस", "ि" + "डवाइस"],
    ["कि.मी.", "ि" + "क.मी."],
    ["वैकल्पिक", "वैक" + "ि" + "ल्पक"], // the sign moves before the whole conjunct ल्प
    ["ज़िंदगी", "ि" + "ज़ंदगी"], // nukta stays with its consonant
    ["बाहर फिट N95 मास्क पहनें", "बाहर " + "ि" + "फट N95 मास्क पहनें"],
  ])("%s", (input, expected) => expect(toVisualOrder(input)).toBe(expected));

  it("leaves text without the sign unchanged: English, digits, long ii, other vowel signs", () => {
    for (const text of ["SmogSense 12:00–15:00", "बहुत खराब", "मास्क की ज़रूरत नहीं", "सबसे अच्छा समय", "गंभीर", "", "AQI 320"]) expect(toVisualOrder(text)).toBe(text);
  });
  it("moves each sign within its own syllable when a word has several", () => {
    expect(toVisualOrder("किसिलिए")).toBe("ि" + "क" + "ि" + "स" + "ि" + "लए");
  });
  it("does not move a sign that has no consonant to attach to", () => {
    expect(toVisualOrder("ि")).toBe("ि");
    expect(toVisualOrder("1 ि")).toBe("1 ि");
  });
  it("does not carry a cluster across spaces or punctuation", () => {
    expect(toVisualOrder("क ि")).toBe("क ि");
  });
});
