import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Heart, MessageCircle, Package, ShieldCheck, ShoppingBag } from "lucide-react";
import api, { errorMessage, fieldErrors, uploadImage } from "../../lib/api.js";
import { compactPeso } from "../../lib/format.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useCurtain } from "../../components/Curtain.jsx";
import { Avatar, CountUp, EASE, Field, Reveal, Spinner } from "../../components/ui.jsx";
import { PasswordStrength } from "../auth/AuthPage.jsx";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;
const NAME_RULE = /^[\p{L}][\p{L} .'-]{1,79}$/u;
const PHONE_RULE = /^$|^[+0-9 ()-]{7,20}$/;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const monthYear = (iso) =>
  iso ? new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(new Date(iso)) : "";

function Details({ admin }) {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const initial = () => ({ fullName: user.fullName || "", phone: user.phone || "", address: user.address || "", bio: user.bio || "" });
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!NAME_RULE.test(form.fullName.trim().replace(/\s+/g, " "))) errs.fullName = "Please enter your full name using letters only.";
    if (!PHONE_RULE.test(form.phone.trim())) errs.phone = "Please enter a valid phone number.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const { data } = await api.put("/profile", form);
      setUser(data);
      const next = { fullName: data.fullName || "", phone: data.phone || "", address: data.address || "", bio: data.bio || "" };
      setForm(next);
      setSaved(next);
      toast("Your details have been saved");
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="profile-card" onSubmit={save} noValidate>
      <div className="profile-card__grid">
        <Field label="Full name" value={form.fullName} maxLength={80} onChange={set("fullName")} error={errors.fullName} autoComplete="name" />
        <Field label="Email" value={user.email} disabled hint="Contact the shop to change your sign-in email." />
        <Field label="Mobile number" type="tel" value={form.phone} maxLength={20} onChange={set("phone")} error={errors.phone} autoComplete="tel" />
        <Field label="Address" value={form.address} maxLength={255} onChange={set("address")} error={errors.address} autoComplete="street-address" />
        <Field
          className="span-2"
          as="textarea"
          rows={3}
          label={admin ? "About you" : "Your vehicles (make, model, year) — helps us check fitment"}
          value={form.bio}
          maxLength={400}
          onChange={set("bio")}
          error={errors.bio}
        />
      </div>
      <div className="profile-card__foot">
        <span className={dirty ? "is-dirty" : ""}>{dirty ? "You have unsaved changes." : "All changes saved."}</span>
        <button type="submit" className="btn btn--steel-soft" disabled={!dirty || busy}>
          {busy ? <Spinner /> : null} Save changes
        </button>
      </div>
    </form>
  );
}

function Security() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const { play } = useCurtain();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = "Please enter your current password.";
    if (!PASSWORD_RULE.test(form.newPassword)) {
      errs.newPassword = "Password must be 8–72 characters with upper and lower case letters, a number and a symbol.";
    }
    if (form.confirm !== form.newPassword) errs.confirm = "The passwords don't match.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.post("/profile/password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast("Password updated. Other devices have been signed out.");
    } catch (err) {
      const f = fieldErrors(err);
      setErrors(Object.keys(f).length ? f : { currentPassword: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const signOutEverywhere = () =>
    play(async () => {
      await logout();
      navigate("/auth", { replace: true });
    }, "Signed out everywhere");

  return (
    <div className="profile-security">
      <form className="profile-card" onSubmit={submit} noValidate>
        <h2 className="profile-card__title">Change password</h2>
        <Field label="Current password" type="password" autoComplete="current-password" maxLength={72}
          value={form.currentPassword} onChange={set("currentPassword")} error={errors.currentPassword} />
        <Field label="New password" type="password" autoComplete="new-password" maxLength={72}
          value={form.newPassword} onChange={set("newPassword")} error={errors.newPassword}
          hint="8–72 characters with upper and lower case letters, a number and a symbol." />
        <PasswordStrength password={form.newPassword} />
        <Field label="Confirm new password" type="password" autoComplete="new-password" maxLength={72}
          value={form.confirm} onChange={set("confirm")} error={errors.confirm} />
        <div className="profile-card__foot">
          <span>Changing your password signs out every other device.</span>
          <button type="submit" className="btn btn--steel-soft" disabled={busy}>
            {busy ? <Spinner /> : null} Update password
          </button>
        </div>
      </form>
      <div className="profile-card">
        <h2 className="profile-card__title">
          <ShieldCheck size={18} /> Sessions
        </h2>
        <p className="profile-card__text">
          You stay signed in with a secure, HttpOnly session cookie that scripts can't read. It renews while you're active
          and ends after two hours of inactivity. Signing out of all devices ends every session, including this one.
        </p>
        <button type="button" className="btn btn--danger" onClick={signOutEverywhere}>
          Sign out of all devices
        </button>
      </div>
    </div>
  );
}

export default function Profile({ admin = false }) {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("details");
  const [progress, setProgress] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    document.title = admin ? "Profile — Rovi Admin" : "My profile — Rovi Autoparts Surplus";
    if (!admin) api.get("/profile/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, [admin]);

  const upload = async (file) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      toast("Only JPG, PNG, WEBP or GIF images are allowed.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("Images must be 5 MB or smaller.", "error");
      return;
    }
    setProgress(0);
    try {
      const data = await uploadImage("/profile/avatar", file, setProgress);
      setUser(data);
      toast("Your photo has been updated");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setProgress(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removePhoto = async () => {
    try {
      const { data } = await api.delete("/profile/avatar");
      setUser(data);
      toast("Your photo has been removed");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  const tiles = stats && [
    { to: "/favorites", icon: Heart, label: "Saved parts", value: stats.favorites },
    { to: "/cart", icon: ShoppingBag, label: "In your bag", value: stats.cartItems },
    { to: "/orders", icon: Package, label: "Reservations", value: stats.orders },
    { to: "/chat", icon: MessageCircle, label: "Unread messages", value: stats.unreadMessages },
  ];

  return (
    <div className={`profile ${admin ? "profile--admin" : ""}`}>
      <section className="profile-hero">
        <div className={admin ? "profile-hero__inner" : "profile-hero__inner container"}>
          <div className="profile-hero__avatar">
            <Avatar name={user.fullName} src={user.avatarUrl} size={128} />
            <button type="button" className="profile-hero__camera" onClick={() => fileInput.current?.click()} aria-label="Change your photo" disabled={progress !== null}>
              {progress !== null ? <span className="profile-hero__pct">{progress}%</span> : <Camera size={18} />}
            </button>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => upload(e.target.files?.[0])} />
            {user.avatarUrl && (
              <button type="button" className="text-btn text-btn--light" onClick={removePhoto}>Remove photo</button>
            )}
          </div>
          <div className="profile-hero__text">
            <p className="eyebrow eyebrow--light">
              {admin ? "Owner · Administrator" : "Customer"} · since {monthYear(user.createdAt)}
            </p>
            <h1>{user.fullName}</h1>
            <p className="profile-hero__meta">
              {user.email}
              {user.address ? ` · 📍 ${user.address}` : ""}
            </p>
          </div>
          {!admin && stats && (
            <div className="profile-hero__spent">
              <p className="eyebrow eyebrow--light">Reserved with us</p>
              <p className="profile-hero__value">
                <CountUp value={stats.spent} format={compactPeso} />
              </p>
            </div>
          )}
        </div>
      </section>

      <div className={admin ? "profile__body" : "profile__body container"}>
        {!admin && tiles && (
          <div className="profile-tiles">
            {tiles.map((t, i) => {
              const Icon = t.icon;
              return (
                <Reveal key={t.to} delay={i * 0.06}>
                  <Link to={t.to} className="profile-tile">
                    <Icon size={20} strokeWidth={1.5} />
                    <span className="profile-tile__value">{t.value}</span>
                    <span className="profile-tile__label">{t.label}</span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}

        <div className="tabs" role="tablist" aria-label="Profile sections">
          {[
            ["details", "Personal details"],
            ["security", "Security"],
          ].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "is-active" : ""} onClick={() => setTab(k)}>
              {label}
              {tab === k && <motion.span layoutId="profile-tab" className="tabs__line" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
            </button>
          ))}
        </div>
        <motion.div key={tab} role="tabpanel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
          {tab === "details" ? <Details admin={admin} /> : <Security />}
        </motion.div>
      </div>
    </div>
  );
}
