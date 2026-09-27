import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import {
  Heart, Home as HomeIcon, LogOut, MapPin, MessageCircle, Package, Search, ShoppingBag, User, UserRound, Wrench, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useShop } from "../context/ShopContext.jsx";
import { useCurtain } from "../components/Curtain.jsx";
import ChatBubble from "../components/ChatBubble.jsx";
import ThemeToggle, { ThemeMenuItem } from "../components/ThemeToggle.jsx";
import PageTransition from "../components/PageTransition.jsx";
import { Avatar, Badge, EASE } from "../components/ui.jsx";
import { SHOP } from "../lib/format.js";

const SUGGESTIONS = ["Engine", "Transmission", "Hilux", "Alternator", "185/65 R15", "Shock absorber"];

function Logo({ to = "/home" }) {
  return (
    <Link to={to} className="logo" aria-label={`${SHOP.name} home`}>
      <span className="logo__main">
        Rovi <em>Autoparts</em>
      </span>
      <span className="logo__sub">Surplus · Cebu City</span>
    </Link>
  );
}

function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const input = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setQ("");
    const t = setTimeout(() => input.current?.focus(), 250);
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const go = (value) => {
    const v = value.trim();
    onClose();
    navigate(v ? `/shop?q=${encodeURIComponent(v)}` : "/shop");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Search the yard"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <button type="button" className="search-overlay__close icon-btn icon-btn--light" onClick={onClose} aria-label="Close search">
            <X size={22} />
          </button>
          <div className="search-overlay__inner">
            <p className="eyebrow eyebrow--light">Search the yard</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                go(q);
              }}
            >
              <label htmlFor="search-overlay-input" className="sr-only">
                What part are you looking for?
              </label>
              <input
                id="search-overlay-input"
                ref={input}
                value={q}
                maxLength={60}
                onChange={(e) => setQ(e.target.value)}
                placeholder="What part are you looking for?"
                autoComplete="off"
              />
            </form>
            <div className="search-overlay__chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="chip-btn chip-btn--light" onClick={() => go(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const { play } = useCurtain();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signOut = () =>
    play(async () => {
      await logout();
      navigate("/auth", { replace: true });
    }, "Until next time");

  return (
    <div className="account" ref={ref}>
      <button
        type="button"
        className="account__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Your account"
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar name={user?.fullName} src={user?.avatarUrl} size={34} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="account__menu"
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="account__head">
              <Avatar name={user?.fullName} src={user?.avatarUrl} size={42} />
              <div>
                <p className="account__name">{user?.fullName}</p>
                <p className="account__email">{user?.email}</p>
              </div>
            </div>
            <Link role="menuitem" to="/profile"><UserRound size={16} /> My profile</Link>
            <Link role="menuitem" to="/orders"><Package size={16} /> Reservations</Link>
            <Link role="menuitem" to="/favorites"><Heart size={16} /> Saved parts</Link>
            <Link role="menuitem" to="/visit"><MapPin size={16} /> Visit the shop</Link>
            <ThemeMenuItem />
            <button role="menuitem" type="button" onClick={signOut}>
              <LogOut size={16} /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BagIcon() {
  const { cart, bump } = useShop();
  const controls = useAnimationControls();
  useEffect(() => {
    if (bump) controls.start({ scale: [1, 1.3, 0.92, 1], rotate: [0, -12, 10, 0], transition: { duration: 0.6, ease: EASE } });
  }, [bump, controls]);
  return (
    <Link to="/cart" className="icon-btn cnav__icon" aria-label={`Your bag, ${cart.count} item${cart.count === 1 ? "" : "s"}`}>
      <motion.span animate={controls} style={{ display: "inline-flex" }}>
        <ShoppingBag size={20} strokeWidth={1.6} />
      </motion.span>
      <Badge count={cart.count} className="badge--amber" />
    </Link>
  );
}

function TabBar() {
  const { cart, favorites } = useShop();
  const location = useLocation();
  const tabs = [
    { to: "/home", label: "Home", icon: HomeIcon },
    { to: "/shop", label: "Shop", icon: Wrench, also: ["/product"] },
    { to: "/favorites", label: "Saved", icon: Heart, count: favorites.size },
    { to: "/cart", label: "Bag", icon: ShoppingBag, count: cart.count },
    { to: "/profile", label: "Me", icon: User, also: ["/orders"] },
  ];
  const isActive = (t) => location.pathname.startsWith(t.to) || t.also?.some((p) => location.pathname.startsWith(p));
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => {
        const active = isActive(t);
        const Icon = t.icon;
        return (
          <Link key={t.to} to={t.to} className={`tabbar__item ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
            {active && <motion.span layoutId="tabbar-pill" className="tabbar__pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="tabbar__icon">
              <Icon size={20} strokeWidth={1.6} />
              <Badge count={t.count || 0} className="badge--amber" />
            </span>
            <span className="tabbar__label">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function CustomerLayout() {
  const location = useLocation();
  const { favorites, unread } = useShop();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const onHome = location.pathname === "/home";
  const onChat = location.pathname.startsWith("/chat");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > 380 && y > last);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const transparent = onHome && !scrolled;

  return (
    <div className={`customer ${onChat ? "customer--chat" : ""}`}>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className={`cnav ${transparent ? "cnav--clear" : ""} ${hidden && !searchOpen ? "is-hidden" : ""}`}>
        <nav className="cnav__left" aria-label="Primary">
          <NavLink to="/home" className="cnav__link">Home</NavLink>
          <NavLink to="/shop" className="cnav__link">Shop</NavLink>
          <NavLink to="/visit" className="cnav__link">Visit Us</NavLink>
        </nav>
        <div className="cnav__center">
          <Logo />
        </div>
        <div className="cnav__right">
          <ThemeToggle className="cnav__icon cnav__icon--desk" />
          <button type="button" className="icon-btn cnav__icon" aria-label="Search" onClick={() => setSearchOpen(true)}>
            <Search size={20} strokeWidth={1.6} />
          </button>
          <Link to="/chat" className="icon-btn cnav__icon cnav__icon--desk" aria-label={`Messages${unread ? `, ${unread} unread` : ""}`}>
            <MessageCircle size={20} strokeWidth={1.6} />
            <Badge count={unread} className="badge--rust" />
          </Link>
          <Link to="/favorites" className="icon-btn cnav__icon cnav__icon--desk" aria-label={`Saved parts, ${favorites.size}`}>
            <Heart size={20} strokeWidth={1.6} />
            <Badge count={favorites.size} className="badge--amber" />
          </Link>
          <BagIcon />
          <AccountMenu />
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <main id="main" className="customer__main" tabIndex={-1}>
        <PageTransition context={{}} />
      </main>

      {!onChat && (
        <footer className="cfooter">
          <p className="cfooter__word" aria-hidden="true">
            Rovi <em>A</em>utoparts
          </p>
          <div className="cfooter__row">
            <span>© 2026 {SHOP.legalName}</span>
            <span>{SHOP.address}</span>
            {SHOP.phones.map((p, i) => (
              <a key={p} href={`tel:${SHOP.phonesIntl[i]}`}>{p}</a>
            ))}
            <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>
            <a href="/privacy.html">Privacy Policy</a>
            <a href="/terms.html">Terms of Service</a>
            <a href="/">Back to the home page</a>
          </div>
        </footer>
      )}

      {!onChat && <ChatBubble />}

      <TabBar />
    </div>
  );
}
