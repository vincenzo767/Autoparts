import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAnimate, useReducedMotion } from "framer-motion";
import { EASE } from "./ui.jsx";

const CurtainContext = createContext({ play: async (action) => action?.() });

/**
 * A full-screen steel panel with the R·A mark. Plays an intro on first load, and
 * play(action, caption) covers the screen, runs the action, then lifts away.
 */
export function CurtainProvider({ children }) {
  const [scope, animate] = useAnimate();
  const [caption, setCaption] = useState("");
  const [active, setActive] = useState(true);
  const busy = useRef(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = scope.current;
    if (!el) return;
    el.style.transformOrigin = "50% 0%";
    const t = setTimeout(async () => {
      await animate(el, { scaleY: 0 }, { duration: reduce ? 0.2 : 1.1, ease: EASE });
      setActive(false);
    }, 350);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const play = useCallback(
    async (action, text = "") => {
      const el = scope.current;
      if (!el || busy.current) {
        await action?.();
        return;
      }
      busy.current = true;
      setCaption(text);
      setActive(true);
      try {
        el.style.transformOrigin = "50% 100%";
        await animate(el, { scaleY: [0, 1] }, { duration: reduce ? 0.15 : 0.7, ease: EASE });
        await action?.();
        await new Promise((r) => setTimeout(r, 180));
        el.style.transformOrigin = "50% 0%";
        await animate(el, { scaleY: 0 }, { duration: reduce ? 0.2 : 1.05, ease: EASE });
      } finally {
        busy.current = false;
        setActive(false);
        setCaption("");
      }
    },
    [animate, scope, reduce],
  );

  const value = useMemo(() => ({ play }), [play]);

  return (
    <CurtainContext.Provider value={value}>
      {children}
      <div ref={scope} className={`curtain ${active ? "is-active" : ""}`} aria-hidden={!active} role="presentation">
        <div className="curtain__inner">
          <span className="curtain__mark">R·A</span>
          {caption && <p className="curtain__caption">{caption}</p>}
        </div>
      </div>
    </CurtainContext.Provider>
  );
}

export const useCurtain = () => useContext(CurtainContext);
