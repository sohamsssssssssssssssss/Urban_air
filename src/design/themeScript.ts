export const THEME_STORAGE_KEY = "smogsense:v1:theme";

/**
 * Runs before first paint so a saved light/dark choice never flashes the wrong theme. "system" (no saved value)
 * leaves the CSS to follow prefers-color-scheme. The value is stored as JSON: "light" | "dark" | "system".
 */
export const THEME_SCRIPT = `try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}));if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
