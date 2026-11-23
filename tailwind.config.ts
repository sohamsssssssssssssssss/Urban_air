import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import { AQI_CATEGORIES, THEME_KEYS, aqiDark, aqiLight, dark, kebab, layout, light, motion, radii, rgbVar, shadowRgb, shadows, toTriplet, type AqiColours, type Theme } from "./src/design/tokens";

const themeVars = (t: Theme, shadow: readonly number[]) => ({
  ...Object.fromEntries(THEME_KEYS.map((k) => [`--c-${kebab(k)}`, toTriplet(t[k])])),
  "--c-shadow": shadow.join(" "),
});
const aqiVars = (scale: Record<string, AqiColours>) =>
  Object.fromEntries(AQI_CATEGORIES.map((c) => [`[data-aqi="${c}"]`, { "--c-aqi-tint": toTriplet(scale[c]!.tint), "--c-aqi-accent": toTriplet(scale[c]!.accent) }]));
/** The same rules apply when the OS prefers dark (unless the user forced light) and when the user forced dark. */
const darkRules = { ...themeVars(dark, shadowRgb.dark), colorScheme: "dark", ...aqiVars(aqiDark) };

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(THEME_KEYS.map((k) => [kebab(k), rgbVar(kebab(k))])),
        "aqi-tint": rgbVar("aqi-tint"),
        "aqi-accent": rgbVar("aqi-accent"),
      },
      borderRadius: radii,
      boxShadow: shadows,
      maxWidth: { shell: layout.shell },
      width: { sidebar: layout.sidebar },
      height: { tabbar: layout.tabbar },
      spacing: { tabbar: layout.tabbar, sidebar: layout.sidebar },
      transitionDuration: { fast: motion.fast, base: motion.base },
      fontFamily: { sans: ["var(--font-sans)", "var(--font-devanagari)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ":root": { ...themeVars(light, shadowRgb.light), colorScheme: "light", ...aqiVars(aqiLight) },
        '@media (prefers-color-scheme: dark)': { ':root:not([data-theme="light"])': darkRules },
        ':root[data-theme="dark"]': darkRules,
      });
    }),
  ],
} satisfies Config;
