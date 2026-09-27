import { createElement, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import { initials, stockInfo } from "../lib/format.js";

export const EASE = [0.22, 1, 0.36, 1];

const motionCache = {};
const motionTag = (as) => (motionCache[as] ||= motion.create ? motion.create(as) : motion[as]);

/** Fades and rises into view once. */
export function Reveal({ as = "div", delay = 0, y = 36, children, ...rest }) {
  const Tag = motionTag(as);
  return (
    <Tag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 1.1, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** A masked line-by-line headline. Observes the heading, not the clipped lines. */
export function SplitTitle({ lines, as = "h2", delay = 0, className = "", ...rest }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  return createElement(
    as,
    { ref, className: `split-title ${className}`.trim(), ...rest },
    lines.map((line, i) => (
      <span className="split-line" key={i}>
        <motion.span
          className="split-line__inner"
          initial={{ y: "105%" }}
          animate={inView ? { y: "0%" } : { y: "105%" }}
          transition={{ duration: 1.2, ease: EASE, delay: delay + i * 0.12 }}
        >
          {line}
        </motion.span>
      </span>
    )),
  );
}

function MaskFrame({ className, rest, children }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  return (
    <div ref={ref} className={`frame ${className}`.trim()} {...rest}>
      <motion.div
        className="frame__mask"
        initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
        animate={{ clipPath: inView ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)" }}
        transition={{ duration: 1.5, ease: EASE }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * A sand-toned image frame. Tracks which src loaded (not a boolean) so a cached
 * image or a changed src never stays hidden.
 */
export function Frame({ src, alt = "", mask = false, eager = false, className = "", children, imgClassName = "", ...rest }) {
  const [loaded, setLoaded] = useState(null);
  const [broken, setBroken] = useState(null);
  const img = useRef(null);

  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(src);
  }, [src]);

  const image = src ? (
    <img
      ref={img}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`${imgClassName} ${loaded === src ? "is-loaded" : ""}`.trim()}
      onLoad={() => setLoaded(src)}
      onError={() => setBroken(src)}
      style={broken === src ? { visibility: "hidden" } : undefined}
    />
  ) : null;

  if (mask) {
    // The clip sits on an inner layer: a fully clipped element never reports as in view.
    return (
      <MaskFrame className={className} rest={rest}>
        {image}
        {children}
      </MaskFrame>
    );
  }
  return (
    <div className={`frame ${className}`.trim()} {...rest}>
      {image}
      {children}
    </div>
  );
}

/** Floating-label input or textarea with an animated underline and error message. */
export function Field({ label, error, as = "input", hint, right, id, className = "", ...props }) {
  const autoId = useId();
  const fieldId = id || autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errId = error ? `${fieldId}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  const Tag = as;
  return (
    <div className={`field ${error ? "field--error" : ""} ${right ? "field--right" : ""} ${className}`.trim()}>
      <div className="field__control">
        <Tag
          id={fieldId}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="field__input"
          {...props}
        />
        <label htmlFor={fieldId} className="field__label">
          {label}
        </label>
        <span className="field__bar" aria-hidden="true" />
        {right && <div className="field__right">{right}</div>}
      </div>
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            className="field__error"
            id={errId}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SelectField({ label, error, id, children, className = "", ...props }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div className={`field field--select ${error ? "field--error" : ""} ${className}`.trim()}>
      <div className="field__control">
        <select id={fieldId} className="field__input" aria-invalid={error ? true : undefined} {...props}>
          {children}
        </select>
        <label htmlFor={fieldId} className="field__label field__label--fixed">
          {label}
        </label>
        <span className="field__bar" aria-hidden="true" />
      </div>
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled, size }) {
  const id = useId();
  return (
    <div className={`toggle-row ${size === "sm" ? "toggle-row--sm" : ""}`}>
      <button
        type="button"
        id={id}
        className={`toggle ${checked ? "is-on" : ""}`}
        aria-pressed={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <motion.span className="toggle__thumb" layout transition={{ type: "spring", stiffness: 520, damping: 32 }} />
      </button>
      {(label || description) && size !== "sm" && (
        <label htmlFor={id} className="toggle-row__text">
          {label && <span className="toggle-row__label">{label}</span>}
          {description && <span className="toggle-row__desc">{description}</span>}
        </label>
      )}
    </div>
  );
}

/** A quantity stepper; the number rolls vertically when it changes. */
export function Stepper({ value, min = 1, max = 99, onChange, size, label = "Quantity" }) {
  const prev = useRef(value);
  const dir = value >= prev.current ? 1 : -1;
  useEffect(() => {
    prev.current = value;
  }, [value]);
  return (
    <div className={`stepper ${size === "sm" ? "stepper--sm" : ""}`} role="group" aria-label={label}>
      <button type="button" aria-label="Decrease" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus size={size === "sm" ? 13 : 15} />
      </button>
      <span className="stepper__value" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: dir * 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -dir * 18, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus size={size === "sm" ? 13 : 15} />
      </button>
    </div>
  );
}

export function Avatar({ name, src, size = 40, className = "" }) {
  const [broken, setBroken] = useState(null);
  const show = src && broken !== src;
  return (
    <span className={`avatar ${className}`.trim()} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {show ? <img src={src} alt="" onError={() => setBroken(src)} /> : initials(name)}
    </span>
  );
}

export function StockBadge({ stock }) {
  const info = stockInfo(stock);
  return <span className={`stock-badge stock-badge--${info.level}`}>{info.label}</span>;
}

/** An animated bar that is full at 10+ units. */
export function StockMeter({ stock }) {
  const info = stockInfo(stock);
  const pct = Math.min(100, (Math.max(0, stock) / 10) * 100);
  return (
    <div className={`stock-meter stock-meter--${info.level}`}>
      <div className="stock-meter__row">
        <span className="stock-meter__label">{info.label}</span>
        {info.hint && <span className="stock-meter__hint">{info.hint}</span>}
      </div>
      <div className="stock-meter__track" aria-hidden="true">
        <motion.span
          className="stock-meter__fill"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
        />
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, eyebrow, width = 520, children }) {
  const titleId = useId();
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    setTimeout(() => panel.current?.focus(), 30);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="modal__scrim" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={panel}
            className="modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            style={{ maxWidth: width }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
            {eyebrow && <p className="eyebrow eyebrow--amber">{eyebrow}</p>}
            {title && (
              <h2 className="modal__title" id={titleId}>
                {title}
              </h2>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <Reveal className="empty-state">
      {Icon && (
        <span className="empty-state__icon" aria-hidden="true">
          <Icon size={28} strokeWidth={1.4} />
        </span>
      )}
      <h2 className="empty-state__title">{title}</h2>
      {text && <p className="empty-state__text">{text}</p>}
      {children && <div className="empty-state__actions">{children}</div>}
    </Reveal>
  );
}

export const Skeleton = ({ className = "", style }) => <span className={`skeleton ${className}`.trim()} style={style} aria-hidden="true" />;

export function PageLoader({ inline = false }) {
  return (
    <div className={`page-loader ${inline ? "page-loader--inline" : ""}`} role="status" aria-label="Loading">
      <span className="page-loader__mark">R·A</span>
      <span className="page-loader__line" />
    </div>
  );
}

export const Spinner = ({ size = 16 }) => <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;

/** Counts up (easing out) when first in view. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-PH") }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const target = Number(value || 0);
  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) {
      setShown(target);
      return undefined;
    }
    const controls = animate(0, target, { duration: 1.6, ease: EASE, onUpdate: setShown });
    return () => controls.stop();
  }, [inView, target, reduce]);
  return <span ref={ref}>{format(inView ? shown : 0)}</span>;
}

export function Badge({ count, className = "" }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key="badge"
          className={`badge ${className}`.trim()}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Status chip used for reservations and part visibility. */
export const Chip = ({ tone = "mute", children }) => <span className={`chip chip--${tone}`}>{children}</span>;

const TIMELINE = [
  ["PENDING", "Pending"],
  ["CONFIRMED", "Confirmed"],
  ["READY_FOR_PICKUP", "Ready"],
  ["COMPLETED", "Completed"],
];

/** Four dots joined by animated bars. A cancelled reservation shows only a rust chip. */
export function StatusTimeline({ status }) {
  if (status === "CANCELLED") return <Chip tone="rust">Cancelled</Chip>;
  const at = TIMELINE.findIndex(([k]) => k === status);
  return (
    <ol className="timeline" aria-label={`Status: ${TIMELINE[at]?.[1] || status}`}>
      {TIMELINE.map(([key, label], i) => (
        <li key={key} className={`timeline__step ${i <= at ? "is-done" : ""} ${i === at ? "is-current" : ""}`}>
          {i > 0 && (
            <span className="timeline__bar" aria-hidden="true">
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: i <= at ? 1 : 0 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.15 * i }}
              />
            </span>
          )}
          <span className="timeline__dot" aria-hidden="true" />
          <span className="timeline__label">{label}</span>
        </li>
      ))}
    </ol>
  );
}
