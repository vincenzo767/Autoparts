import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { EASE } from "./ui.jsx";

/** Sun/moon icon button that switches between light and dark mode. */
export default function ThemeToggle({ className = "" }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`icon-btn theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={isDark ? "moon" : "sun"}
          className="theme-toggle__icon"
          initial={{ opacity: 0, rotate: -80, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 80, scale: 0.5 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {isDark ? <Moon size={19} strokeWidth={1.6} /> : <Sun size={19} strokeWidth={1.6} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/** The same switch as a row in a menu, with an on/off track. */
export function ThemeMenuItem() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button type="button" role="menuitemcheckbox" aria-checked={isDark} className="theme-item" onClick={toggleTheme}>
      <Moon size={16} /> Dark mode
      <span className={`theme-item__track ${isDark ? "is-on" : ""}`} aria-hidden="true">
        <motion.span className="theme-item__thumb" layout transition={{ type: "spring", stiffness: 520, damping: 32 }} />
      </span>
    </button>
  );
}
