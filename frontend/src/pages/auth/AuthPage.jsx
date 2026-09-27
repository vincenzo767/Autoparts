import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, EyeOff } from "lucide-react";
import api, { errorMessage, fieldErrors } from "../../lib/api.js";
import { IMAGES, SHOP, firstName, sized } from "../../lib/format.js";
import { homeFor, pathSuitsRole } from "../../lib/routes.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCurtain } from "../../components/Curtain.jsx";
import { EASE, Field, Modal, Spinner } from "../../components/ui.jsx";

const SLIDES = [
  { src: IMAGES.engines, caption: "Engines & Transmissions" },
  { src: IMAGES.tires, caption: "Tires & Wheels" },
  { src: IMAGES.yard, caption: "The Yard" },
];

const NAME_RULE = /^[\p{L}][\p{L} .'-]{1,79}$/u;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RULE = /^$|^[+0-9 ()-]{7,20}$/;
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;
const PASSWORD_MESSAGE = "Password must be 8–72 characters with upper and lower case letters, a number and a symbol.";

const RULES = [
  { key: "len", label: "8+ characters", test: (p) => p.length >= 8 },
  { key: "upper", label: "Upper case", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "Lower case", test: (p) => /[a-z]/.test(p) },
  { key: "num", label: "A number", test: (p) => /\d/.test(p) },
  { key: "sym", label: "A symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];
const STRENGTH = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
const COMMON = /^(password|qwerty|12345|abc123|admin|letmein|welcome|iloveyou)/i;

export function passwordScore(p) {
  if (!p) return 0;
  let score = RULES.filter((r) => r.test(p)).length;
  if (p.length >= 12) score += 1;
  if (/(.)\1\1/.test(p) || COMMON.test(p)) score -= 2;
  return Math.max(0, Math.min(6, score));
}

/** Live password checklist and 6-bar strength meter. */
export function PasswordStrength({ password }) {
  const score = passwordScore(password);
  return (
    <div className="pw">
      <div className="pw__bars" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={`pw__bar ${i < score ? `is-on pw__bar--${Math.min(score, 6)}` : ""}`} />
        ))}
      </div>
      <p className="pw__label" aria-live="polite">
        {password ? STRENGTH[Math.max(0, score - 1)] : "Password strength"}
      </p>
      <ul className="pw__rules">
        {RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.key} className={ok ? "is-ok" : ""}>
              <Check size={12} aria-hidden="true" /> {r.label}
              <span className="sr-only">{ok ? " (done)" : " (missing)"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function capsHandler(setCaps) {
  return (e) => {
    if (e.getModifierState) setCaps(e.getModifierState("CapsLock"));
  };
}

function Visual() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="auth__visual" aria-label="Rovi Autoparts Surplus">
      <AnimatePresence initial={false}>
        <motion.div
          key={i}
          className="auth__slide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: EASE }}
        >
          <motion.img
            src={sized(SLIDES[i].src, 1600)}
            alt=""
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 8, ease: "linear" }}
          />
        </motion.div>
      </AnimatePresence>
      <div className="auth__shade" aria-hidden="true" />
      <div className="auth__visual-content">
        <a href="/" className="auth__back">← Back to the home page</a>
        <div>
          <p className="eyebrow eyebrow--light">The Parts Counter</p>
          <h1 className="auth__headline">
            Built once,
            <br />
            <em>driven again.</em>
          </h1>
          <p className="auth__quote">
            Save the parts you need, reserve them for pickup, and chat with our team — all in one place.
          </p>
        </div>
        <div className="auth__dots">
          <div role="tablist" aria-label="Slides">
            {SLIDES.map((s, n) => (
              <button
                key={s.caption}
                type="button"
                role="tab"
                aria-selected={n === i}
                aria-label={s.caption}
                className={n === i ? "is-active" : ""}
                onClick={() => setI(n)}
              />
            ))}
          </div>
          <span>{SLIDES[i].caption}</span>
        </div>
      </div>
    </section>
  );
}

function SignInForm({ onSuccess, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [forgot, setForgot] = useState(false);
  const [shake, setShake] = useState(0);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!EMAIL_RULE.test(email.trim())) errs.email = "Please enter a valid email address.";
    if (!password) errs.password = "Please enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email: email.trim(), password });
      await onSuccess(data, false);
    } catch (err) {
      setError(errorMessage(err));
      setShake((s) => s + 1);
      setPassword("");
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h2 className="auth-form__title">
        Welcome <em>back.</em>
      </h2>
      <p className="auth-form__sub">Sign in to continue to the shop.</p>
      <AnimatePresence>
        {error && (
          <motion.div
            key={shake}
            className="alert alert--error"
            role="alert"
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: [0, -10, 9, -6, 4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      <Field label="Email" type="email" autoComplete="email" value={email} maxLength={160}
        onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
      <Field
        label="Password"
        type={show ? "text" : "password"}
        autoComplete="current-password"
        value={password}
        maxLength={72}
        onChange={(e) => setPassword(e.target.value)}
        onKeyUp={capsHandler(setCaps)}
        onKeyDown={capsHandler(setCaps)}
        error={errors.password}
        hint={caps ? "Caps Lock is on" : undefined}
        required
        right={
          <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        }
      />
      <div className="auth-form__row">
        <span className="auth-form__secure">🔒 Encrypted session</span>
        <button type="button" className="text-btn" onClick={() => setForgot(true)}>
          Forgot password?
        </button>
      </div>
      <button type="submit" className="btn btn--solid btn--block" disabled={busy}>
        {busy ? (
          <>
            <Spinner /> Signing in
          </>
        ) : (
          "Enter the shop →"
        )}
      </button>
      <p className="auth-form__switch">
        New to Rovi?{" "}
        <button type="button" className="text-btn text-btn--strong" onClick={onSwitch}>
          Create an account
        </button>
      </p>

      <Modal open={forgot} onClose={() => setForgot(false)} eyebrow="Account help" title="Reset your password">
        <p className="modal__text">
          For your security, password resets are handled personally by our team. Call us or visit the shop with a valid ID
          and we'll restore access the same day.
        </p>
        <div className="forgot__phones">
          {SHOP.phones.map((p, i) => (
            <a key={p} href={`tel:${SHOP.phonesIntl[i]}`}>{p}</a>
          ))}
        </div>
        <p className="modal__text">{SHOP.address}</p>
        <div className="modal__actions">
          <button type="button" className="btn btn--solid" onClick={() => setForgot(false)}>
            Understood
          </button>
        </div>
      </Modal>
    </form>
  );
}

function RegisterForm({ onSuccess, onSwitch }) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirm: "", website: "" });
  const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    const name = form.fullName.trim().replace(/\s+/g, " ");
    const email = form.email.trim().toLowerCase();
    if (!name) e.fullName = "Please enter your full name.";
    else if (!NAME_RULE.test(name)) e.fullName = "Please enter your full name using letters only.";
    if (!EMAIL_RULE.test(email) || email.length > 160) e.email = "Please enter a valid email address.";
    if (!PHONE_RULE.test(form.phone.trim())) e.phone = "Please enter a valid phone number.";
    if (!PASSWORD_RULE.test(form.password)) e.password = PASSWORD_MESSAGE;
    else {
      const local = email.split("@")[0];
      if (local.length >= 3 && form.password.toLowerCase().includes(local)) e.password = "Your password shouldn't contain your email name.";
    }
    if (form.confirm !== form.password) e.confirm = "The passwords don't match.";
    if (!agree) e.agree = "Please agree to continue.";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/register", {
        fullName: form.fullName.trim().replace(/\s+/g, " "),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        website: form.website,
      });
      await onSuccess(data, true);
    } catch (err) {
      const f = fieldErrors(err);
      setErrors(f);
      setError(Object.keys(f).length ? "" : errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h2 className="auth-form__title">
        Create your <em>account.</em>
      </h2>
      <p className="auth-form__sub">Create your account to save parts, reserve them for pickup and chat with our team.</p>
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}
      <div className="hp" aria-hidden="true">
        <label htmlFor="reg-website">Website</label>
        <input id="reg-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
      </div>
      <div className="auth-form__grid">
        <Field className="span-2" label="Full name" autoComplete="name" maxLength={80} value={form.fullName}
          onChange={set("fullName")} error={errors.fullName} required />
        <Field label="Email" type="email" autoComplete="email" maxLength={160} value={form.email}
          onChange={set("email")} error={errors.email} required />
        <Field label="Mobile (optional)" type="tel" autoComplete="tel" maxLength={20} value={form.phone}
          onChange={set("phone")} error={errors.phone} />
      </div>
      <Field
        label="Create password"
        type={show ? "text" : "password"}
        autoComplete="new-password"
        maxLength={72}
        value={form.password}
        onChange={set("password")}
        onKeyUp={capsHandler(setCaps)}
        onKeyDown={capsHandler(setCaps)}
        error={errors.password}
        required
        right={
          <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        }
      />
      <PasswordStrength password={form.password} />
      {caps && <p className="field__hint">Caps Lock is on</p>}
      <Field label="Confirm password" type={show ? "text" : "password"} autoComplete="new-password" maxLength={72}
        value={form.confirm} onChange={set("confirm")} error={errors.confirm} required />
      <label className={`check ${errors.agree ? "check--error" : ""}`}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span className="check__box" aria-hidden="true"><Check size={12} /></span>
        <span>
          I agree that Rovi Autoparts Surplus may store my details to manage my account and reservations, as described in
          the <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a> and{" "}
          <a href="/terms.html" target="_blank" rel="noopener">Terms</a>.
        </span>
      </label>
      {errors.agree && <p className="field__error">{errors.agree}</p>}
      <button type="submit" className="btn btn--solid btn--block" disabled={busy}>
        {busy ? (
          <>
            <Spinner /> Creating your account
          </>
        ) : (
          "Create my account →"
        )}
      </button>
      <p className="auth-form__switch">
        Already a customer?{" "}
        <button type="button" className="text-btn text-btn--strong" onClick={onSwitch}>
          Sign in
        </button>
      </p>
    </form>
  );
}

export default function AuthPage() {
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "register" ? "register" : "signin";
  const { setUser } = useAuth();
  const { play } = useCurtain();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = mode === "register" ? "Create an account — Rovi Autoparts Surplus" : "Sign in — Rovi Autoparts Surplus";
  }, [mode]);

  const setMode = (m) => setParams(m === "register" ? { mode: "register" } : {}, { replace: true });

  const onSuccess = async (user, isNew) => {
    const from = location.state?.from;
    const target = pathSuitsRole(from?.split("?")[0], user) ? from : homeFor(user);
    const caption = isNew ? `Welcome, ${firstName(user.fullName)}` : `Welcome back, ${firstName(user.fullName)}`;
    // Set the user only once the curtain covers the screen, so the redirect happens behind it.
    await play(() => {
      setUser(user);
      navigate(target, { replace: true });
    }, caption);
  };

  const tabs = useMemo(() => [
    { key: "signin", label: "Sign in" },
    { key: "register", label: "Create account" },
  ], []);

  return (
    <div className="auth">
      <Visual />
      <section className="auth__panel">
        <div className="auth__card">
          <a href="/" className="logo logo--dark" aria-label={`${SHOP.name} home page`}>
            <span className="logo__main">
              Rovi <em>Autoparts</em>
            </span>
            <span className="logo__sub">Surplus · Cebu City</span>
          </a>
          <div className="auth__tabs" role="tablist" aria-label="Sign in or create an account">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={mode === t.key}
                className={mode === t.key ? "is-active" : ""}
                onClick={() => setMode(t.key)}
              >
                {t.label}
                {mode === t.key && <motion.span layoutId="auth-tab" className="auth__tab-line" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
              </button>
            ))}
          </div>
          <div className="auth__forms">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === "register" ? 40 : -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === "register" ? -40 : 40 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                {mode === "signin" ? (
                  <SignInForm onSuccess={onSuccess} onSwitch={() => setMode("register")} />
                ) : (
                  <RegisterForm onSuccess={onSuccess} onSwitch={() => setMode("signin")} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="auth__trust">🛡 Protected with encrypted sessions, CSRF defence and brute-force lockout.</p>
        </div>
      </section>
    </div>
  );
}
