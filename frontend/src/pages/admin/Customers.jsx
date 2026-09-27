import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, Search, Users } from "lucide-react";
import api, { errorMessage } from "../../lib/api.js";
import { compactPeso, formatDate, plural, relativeTime } from "../../lib/format.js";
import { useToast } from "../../context/ToastContext.jsx";
import { Avatar, EASE, EmptyState, Modal, PageLoader, Toggle } from "../../components/ui.jsx";

export default function Customers() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState(null);
  const [q, setQ] = useState("");
  const [suspending, setSuspending] = useState(null);

  useEffect(() => {
    document.title = "Customers — Rovi Admin";
    api.get("/admin/customers").then(({ data }) => setCustomers(data)).catch(() => setCustomers([]));
  }, []);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (customers || []).filter(
      (c) => !term || [c.fullName, c.email, c.phone].some((f) => f && f.toLowerCase().includes(term)),
    );
  }, [customers, q]);

  const setEnabled = async (c, enabled) => {
    try {
      const { data } = await api.patch(`/admin/customers/${c.id}/status`, { enabled });
      setCustomers((list) => list.map((x) => (x.id === data.id ? data : x)));
      toast(enabled ? `${data.fullName}'s account reactivated` : `${data.fullName}'s account suspended and signed out`);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  if (!customers) return <PageLoader inline />;

  return (
    <div className="customers">
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} aria-hidden="true" />
          <label htmlFor="cust-search" className="sr-only">Search customers</label>
          <input id="cust-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or phone" />
        </div>
        <p className="toolbar__count">{plural(customers.length, "registered customer")}</p>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={Users} title={customers.length ? "No customers match." : "No customers yet."}
          text={customers.length ? "Try another name, email or phone." : "Customers appear here as soon as they create an account."} />
      ) : (
        <div className="cust-grid">
          {shown.map((c, i) => (
            <motion.article
              key={c.id}
              className={`cust ${c.enabled ? "" : "is-suspended"}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 8) * 0.05 }}
            >
              <header className="cust__head">
                <Avatar name={c.fullName} src={c.avatarUrl} size={52} />
                <div>
                  <p className="cust__name">{c.fullName}</p>
                  <p className="cust__email">{c.email}</p>
                </div>
              </header>
              <dl className="cust__facts">
                <div><dt>Reservations</dt><dd>{c.orders}</dd></div>
                <div><dt>Reserved value</dt><dd>{compactPeso(c.spent)}</dd></div>
                <div><dt>Joined</dt><dd>{formatDate(c.createdAt)}</dd></div>
                <div><dt>Last seen</dt><dd>{c.lastLoginAt ? relativeTime(c.lastLoginAt) : "—"}</dd></div>
              </dl>
              <p className="cust__contact">
                {[c.phone, c.address].filter(Boolean).join(" · ") || "No phone or address yet"}
              </p>
              <footer className="cust__foot">
                <Toggle
                  size="sm"
                  checked={c.enabled}
                  label={c.enabled ? `Suspend ${c.fullName}` : `Reactivate ${c.fullName}`}
                  onChange={(v) => (v ? setEnabled(c, true) : setSuspending(c))}
                />
                <span className="cust__state">{c.enabled ? "Active" : "Suspended"}</span>
                <Link to={`/admin/messages?c=${c.id}`} className="btn btn--sm"><MessageCircle size={14} /> Message</Link>
              </footer>
            </motion.article>
          ))}
        </div>
      )}

      <Modal open={!!suspending} onClose={() => setSuspending(null)} eyebrow="Suspend account" title={`Suspend ${suspending?.fullName}?`}>
        <p className="modal__text">
          They'll be signed out immediately and won't be able to sign in until you reactivate the account. Their
          reservations and messages are kept.
        </p>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={() => setSuspending(null)}>Keep active</button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={async () => {
              const c = suspending;
              setSuspending(null);
              await setEnabled(c, false);
            }}
          >
            Suspend
          </button>
        </div>
      </Modal>
    </div>
  );
}
