import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const KEY = "ra-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext(null);

function savedTheme() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

const systemTheme = () => (window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light");

/**
 * Light or dark: the viewer's saved choice, otherwise the device setting. The choice is kept per
 * browser and applied as data-theme on <html>, which switches the colour tokens in base.css.
 */
export function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(savedTheme);
  const [system, setSystem] = useState(systemTheme);
  const theme = choice || system;

  useEffect(() => {
    const mq = window.matchMedia?.(DARK_QUERY);
    if (!mq) return undefined;
    const onChange = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next) => {
    setChoice(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private mode or blocked storage: the choice lasts for this visit only.
    }
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  const value = useMemo(() => ({ theme, isDark: theme === "dark", setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
