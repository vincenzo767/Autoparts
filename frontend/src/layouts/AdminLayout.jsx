import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Boxes, Cog, ExternalLink, LayoutDashboard, LogOut, Menu, MessagesSquare, Package, Plus, UserRound, Users, X,
} from "lucide-react";
import api from "../lib/api.js";
import { firstName } from "../lib/format.js";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { useSocket, useChatEvents } from "../context/SocketContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useCurtain } from "../components/Curtain.jsx";
import PageTransition from "../components/PageTransition.jsx";
import { Avatar, Badge, EASE } from "../components/ui.jsx";

const NAV = [
  { to: "/admin", end: true, icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/products", icon: Cog, label: "Parts" },
  { to: "/admin/inventory", icon: Boxes, label: "Inventory", count: "lowStock" },
  { to: "/admin/orders", icon: Package, label: "Reservations", count: "pending" },
  { to: "/admin/customers", icon: Users, label: "Customers" },
  { to: "/admin/messages", icon: MessagesSquare, label: "Messages", count: "unread" },
  { to: "/admin/profile", icon: UserRound, label: "Profile" },
];

function titleFor(path) {
  if (path === "/admin" || path === "/admin/") return ["Overview", "Dashboard"];
  if (path === "/admin/products") return ["Catalogue", "Parts"];
  if (path === "/admin/products/new") return ["Catalogue", "New part"];
  if (path.startsWith("/admin/products/")) return ["Catalogue", "Edit part"];
  if (path.startsWith("/admin/inventory")) return ["Stock", "Inventory"];
  if (path.startsWith("/admin/orders")) return ["Pickups", "Reservations"];
  if (path.startsWith("/admin/customers")) return ["Customers", "Customers"];
  if (path.startsWith("/admin/messages")) return ["Inbox", "Messages"];
  if (path.startsWith("/admin/profile")) return ["Account", "Profile"];
  return ["Overview", "Dashboard"];
}

const today = () =>
  new Intl.DateTimeFormat("en-PH", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Manila" }).format(new Date());

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { toast } = useToast();
  const { play } = useCurtain();
  const navigate = useNavigate();
  const location = useLocation();
  const [counts, setCounts] = useState({ unread: 0, pending: 0, lowStock: 0 });
  const [drawer, setDrawer] = useState(false);
  const inFlight = useRef(false);
  const queued = useRef(false);
  const [eyebrow, title] = titleFor(location.pathname);

  // At most one request in flight; a request made meanwhile runs once it finishes.
  const refreshCounts = useCallback(async () => {
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    inFlight.current = true;
    try {
      const { data } = await api.get("/admin/counts");
      setCounts(data);
    } catch {
      // keep the last counts
    } finally {
      inFlight.current = false;
      if (queued.current) {
        queued.current = false;
        refreshCounts();
      }
    }
  }, []);

  useEffect(() => {
    refreshCounts();
    setDrawer(false);
    window.scrollTo(0, 0);
  }, [location.pathname, refreshCounts]);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  useChatEvents((event) => {
    refreshCounts();
    if (event.type === "message" && event.message && !event.message.fromAdmin && !location.pathname.startsWith("/admin/messages")) {
      toast(`New message from ${event.message.senderName}`);
    }
  });

  const signOut = () =>
    play(async () => {
      await logout();
      navigate("/auth", { replace: true });
    }, "Until next time");

  return (
    <div className="admin">
      <a href="#admin-main" className="skip-link">Skip to content</a>
      <AnimatePresence>
        {drawer && (
          <motion.div
            className="admin__scrim"
            onClick={() => setDrawer(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      <aside className={`sidebar ${drawer ? "is-open" : ""}`} aria-label="Admin navigation">
        <div className="sidebar__brand">
          <span className="sidebar__mono" aria-hidden="true">R·A</span>
          <div>
            <p className="sidebar__word">
              Rovi <em>Autoparts</em>
            </p>
            <p className="sidebar__role">Owner's Garage</p>
          </div>
          <button type="button" className="icon-btn icon-btn--light sidebar__close" onClick={() => setDrawer(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <Link to="/admin/products/new" className="sidebar__cta">
          <Plus size={16} /> Add a new part
        </Link>
        <p className="sidebar__label">Manage</p>
        <nav className="sidebar__nav">
          {NAV.map((n) => {
            const Icon = n.icon;
            const count = n.count ? counts[n.count] : 0;
            return (
              <NavLink key={n.to} to={n.to} end={n.end} className="sidebar__link">
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span layoutId="sidebar-active" className="sidebar__active" transition={{ type: "spring", stiffness: 420, damping: 36 }} />
                    )}
                    <Icon size={18} strokeWidth={1.6} />
                    <span>{n.label}</span>
                    {count > 0 && <span className="sidebar__count">{count > 99 ? "99+" : count}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar__foot">
          <a href="/" target="_blank" rel="noopener" className="sidebar__site">
            <ExternalLink size={15} /> View home page
          </a>
          <div className="sidebar__me">
            <Avatar name={user?.fullName} src={user?.avatarUrl} size={36} />
            <div className="sidebar__me-text">
              <p>{user?.fullName}</p>
              <span className={`live ${connected ? "is-live" : ""}`}>
                <i aria-hidden="true" /> {connected ? "Live" : "Connecting"}
              </span>
            </div>
            <button type="button" className="icon-btn icon-btn--light" onClick={signOut} aria-label="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div className="admin__body">
        <header className="topbar">
          <button type="button" className="icon-btn topbar__burger" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer}>
            <Menu size={22} />
          </button>
          <div className="topbar__title">
            {/* Keyed so each page change remounts the title and plays its entrance. */}
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <p className="eyebrow eyebrow--amber">{eyebrow}</p>
              <h1>{title}</h1>
            </motion.div>
          </div>
          <div className="topbar__right">
            <span className="topbar__date">{today()}</span>
            <ThemeToggle />
            <Link to="/admin/messages" className="icon-btn topbar__msg" aria-label={`Messages${counts.unread ? `, ${counts.unread} unread` : ""}`}>
              <MessagesSquare size={20} strokeWidth={1.6} />
              <Badge count={counts.unread} className="badge--rust" />
            </Link>
            <Link to="/admin/profile" className="topbar__hello">
              <span>Hello, {firstName(user?.fullName)}</span>
              <Avatar name={user?.fullName} src={user?.avatarUrl} size={30} />
            </Link>
          </div>
        </header>
        <main id="admin-main" className="admin__main" tabIndex={-1}>
          <PageTransition context={{ refreshCounts }} />
        </main>
      </div>
    </div>
  );
}
