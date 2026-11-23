/**
 * Design tokens: the single source of truth for colour, radius, shadow and layout sizes.
 * `tailwind.config.ts` turns these into CSS variables (light, dark, and per-AQI-category) and Tailwind utilities,
 * and `tests/unit/design-contrast.test.ts` checks every text/background pair meets WCAG AA in both themes.
 * Colours are "R G B" triplets so Tailwind can apply opacity.
 */
export type Rgb = readonly [number, number, number];

export const THEME_KEYS = [
  "canvas", "surface", "sunken", "line", "lineStrong", "ink", "inkMuted",
  "brand", "brandHover", "brandInk", "brandSoft", "brandText", "focus",
  "danger", "dangerInk", "dangerSoft", "dangerText",
  "warn", "warnSoft", "warnText",
  "ok", "okSoft", "okText",
] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];
export type Theme = Record<ThemeKey, Rgb>;

export const light: Theme = {
  canvas: [244, 247, 250], surface: [255, 255, 255], sunken: [236, 241, 246],
  line: [214, 222, 232], lineStrong: [116, 129, 147],
  ink: [15, 23, 42], inkMuted: [71, 85, 105],
  brand: [29, 78, 216], brandHover: [30, 64, 175], brandInk: [255, 255, 255], brandSoft: [219, 234, 254], brandText: [30, 64, 175], focus: [29, 78, 216],
  danger: [185, 28, 28], dangerInk: [255, 255, 255], dangerSoft: [254, 226, 226], dangerText: [127, 29, 29],
  warn: [180, 83, 9], warnSoft: [254, 243, 199], warnText: [120, 53, 15],
  ok: [21, 128, 61], okSoft: [220, 252, 231], okText: [20, 83, 45],
};

export const dark: Theme = {
  canvas: [8, 13, 24], surface: [15, 23, 42], sunken: [30, 41, 59],
  line: [51, 65, 85], lineStrong: [120, 134, 155],
  ink: [241, 245, 249], inkMuted: [168, 181, 199],
  brand: [96, 165, 250], brandHover: [147, 197, 253], brandInk: [8, 13, 24], brandSoft: [30, 58, 138], brandText: [147, 197, 253], focus: [147, 197, 253],
  danger: [248, 113, 113], dangerInk: [8, 13, 24], dangerSoft: [69, 10, 10], dangerText: [254, 202, 202],
  warn: [251, 191, 36], warnSoft: [69, 26, 3], warnText: [253, 230, 138],
  ok: [74, 222, 128], okSoft: [5, 46, 22], okText: [187, 247, 208],
};

/**
 * CPCB category colours, toned down so text stays AA: `tint` is the hero background, `accent` is for bars, borders and icons.
 * The category is always also written as text, so colour is never the only signal.
 */
export const AQI_CATEGORIES = ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"] as const;
export type AqiKey = (typeof AQI_CATEGORIES)[number];
export interface AqiColours { tint: Rgb; accent: Rgb }

export const aqiLight: Record<AqiKey, AqiColours> = {
  Good: { tint: [220, 245, 230], accent: [18, 114, 54] },
  Satisfactory: { tint: [235, 247, 215], accent: [68, 110, 12] },
  Moderate: { tint: [253, 246, 200], accent: [146, 88, 6] },
  Poor: { tint: [254, 232, 200], accent: [176, 58, 10] },
  "Very Poor": { tint: [254, 220, 218], accent: [185, 28, 28] },
  Severe: { tint: [245, 214, 222], accent: [136, 19, 55] },
};

export const aqiDark: Record<AqiKey, AqiColours> = {
  Good: { tint: [10, 46, 29], accent: [74, 222, 128] },
  Satisfactory: { tint: [28, 46, 12], accent: [163, 230, 53] },
  Moderate: { tint: [54, 44, 8], accent: [250, 204, 21] },
  Poor: { tint: [58, 33, 10], accent: [251, 146, 60] },
  "Very Poor": { tint: [63, 22, 22], accent: [248, 113, 113] },
  Severe: { tint: [58, 17, 32], accent: [251, 113, 133] },
};

/** Shapes and layout sizes (rem). Components use these through Tailwind classes only. */
export const radii = { card: "1rem", control: "0.75rem", pill: "9999px" } as const;
export const shadows = {
  card: "0 1px 2px rgb(var(--c-shadow) / 0.06), 0 2px 8px rgb(var(--c-shadow) / 0.06)",
  raised: "0 4px 24px rgb(var(--c-shadow) / 0.18)",
} as const;
export const layout = { shell: "72rem", sidebar: "15rem", tabbar: "4rem" } as const;
/** Motion lasts 150-200 ms and is switched off under prefers-reduced-motion (see globals.css). */
export const motion = { fast: "150ms", base: "200ms" } as const;
/** RGB triplet used for shadows in each theme. */
export const shadowRgb = { light: [15, 23, 42], dark: [0, 0, 0] } as const;

export const rgbVar = (key: string) => `rgb(var(--c-${key}) / <alpha-value>)`;
export const toTriplet = (c: Rgb) => c.join(" ");
export const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
