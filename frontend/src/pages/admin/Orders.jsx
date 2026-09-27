import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MessageCircle, Package } from "lucide-react";
import api, { errorMessage } from "../../lib/api.js";
import {
  ORDER_STATUS, PAYMENT_METHODS, formatDate, formatDateTime, formatPrice, paymentLabel, sized, timeLeft,
} from "../../lib/format.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useChatEvents } from "../../context/SocketContext.jsx";
import { Chip, EASE, EmptyState, Frame, Modal, PageLoader, Spinner, StatusTimeline } from "../../components/ui.jsx";

const OPEN = ["PENDING", "CONFIRMED", "READY_FOR_PICKUP"];
const TABS = [
  ["open", "Open", (o) => OPEN.includes(o.status)],
  ["pending", "Pending", (o) => o.status === "PENDING"],
  ["ready", "Ready", (o) => o.status === "READY_FOR_PICKUP"],
  ["completed", "Completed", (o) => o.status === "COMPLETED"],
  ["cancelled", "Cancelled", (o) => o.status === "CANCELLED"],
  ["all", "All", () => true],
];

function CollectModal({ order, onClose, onDone }) {
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMethod("CASH");
    setReference("");
    setError("");
  }, [order?.id]);

  const confirm = async () => {
    setBusy(true);
    setError("");
    const ok = await onDone(order, { status: "COMPLETED", paymentMethod: method, paymentReference: reference.trim() || null });
    setBusy(false);
    if (!ok) setError("That didn't save. Check the details and try again.");
  };

  return (
    <Modal open={!!order} onClose={() => !busy && onClose()} eyebrow="Mark as collected" title={`Collect ${order?.reference || ""}`}>
      <p className="modal__text">
        Only confirm once {order?.customerName} has paid in full and taken the parts. This records the sale and can't be undone.
      </p>
      <div className="collect__amount">
        <span>Amount received</span>
        <strong>{formatPrice(order?.total)}</strong>
      </div>
      <fieldset className="collect__methods">
        <legend>Paid by</legend>
        <div className="pills">
          {PAYMENT_METHODS.map((m) => (
            <button key={m.key} type="button" aria-pressed={method === m.key} className={`pill ${method === m.key ? "is-active" : ""}`} onClick={() => setMethod(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="summary__label" htmlFor="pay-ref">
        {method === "CASH" ? "Receipt number (optional)" : "Reference / transaction number (optional)"}
      </label>
      <input id="pay-ref" className="input" value={reference} maxLength={80} onChange={(e) => setReference(e.target.value)} />
      {error && <p className="field__error">{error}</p>}
      <div className="modal__actions">
        <button type="button" className="btn" onClick={onClose} disabled={busy}>Not yet</button>
        <button type="button" className="btn btn--solid" onClick={confirm} disabled={busy}>
          {busy ? <Spinner /> : null} Confirm collected & paid
        </button>
      </div>
    </Modal>
  );
}

export default function AdminOrders() {
  const { toast } = useToast();
  const { refreshCounts } = useOutletContext();
  const [orders, setOrders] = useState(null);
  const [tab, setTab] = useState("open");
  const [expanded, setExpanded] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [collecting, setCollecting] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => api.get("/admin/orders").then(({ data }) => setOrders(data)).catch(() => setOrders([]));

  useEffect(() => {
    document.title = "Reservations — Rovi Admin";
    load();
  }, []);

  // A customer cancelling shows up in chat events only indirectly; refresh the list on any event.
  useChatEvents(() => load());

  const replace = (o) => setOrders((list) => list.map((x) => (x.id === o.id ? o : x)));

  const setStatus = async (order, body) => {
    setBusy(order.id);
    try {
      const { data } = await api.patch(`/admin/orders/${order.id}/status`, body);
      replace(data);
      toast(`${data.reference} — ${ORDER_STATUS[data.status].label}. The customer has been notified.`);
      refreshCounts();
      return true;
    } catch (e) {
      toast(errorMessage(e), "error");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const extend = async (order) => {
    setBusy(order.id);
    try {
      const { data } = await api.patch(`/admin/orders/${order.id}/hold`, { days: 7 });
      replace(data);
      toast(`${data.reference} is now held until ${formatDate(data.holdUntil)}.`);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const counts = useMemo(() => {
    const c = {};
    TABS.forEach(([k, , fn]) => (c[k] = (orders || []).filter(fn).length));
    return c;
  }, [orders]);

  if (!orders) return <PageLoader inline />;
  const shown = orders.filter(TABS.find(([k]) => k === tab)[2]);

  return (
    <div className="aorders">
      <div className="pills pills--tabs" role="tablist" aria-label="Reservation status">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={`pill ${tab === k ? "is-active" : ""}`} onClick={() => setTab(k)}>
            {label} <span className="pill__count">{counts[k]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={Package} title="Nothing here." text="Reservations in this view will appear here." />
      ) : (
        <ul className="acc">
          {shown.map((o) => {
            const st = ORDER_STATUS[o.status];
            const isOpen = expanded === o.id;
            const open = OPEN.includes(o.status);
            const left = timeLeft(o.holdUntil);
            const soon = o.holdUntil && new Date(o.holdUntil).getTime() - Date.now() < 2 * 86400000;
            return (
              <li key={o.id} className={`acc__item ${isOpen ? "is-open" : ""}`}>
                <button type="button" className="acc__head" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : o.id)}>
                  <span className="acc__ref">{o.reference}</span>
                  <span className="acc__cust">
                    <strong>{o.customerName}</strong>
                    <small>{o.customerEmail}</small>
                  </span>
                  <span className="acc__date">{formatDateTime(o.createdAt)}</span>
                  <span className="acc__total">{formatPrice(o.total)}</span>
                  <Chip tone={st.tone}>{st.short}</Chip>
                  <motion.span className="acc__chev" animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown size={18} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="acc__body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: EASE }}
                    >
                      <div className="acc__inner">
                        <StatusTimeline status={o.status} />
                        <ul className="order-card__items">
                          {o.items.map((it, i) => (
                            <li key={i}>
                              <Frame src={sized(it.imageUrl, 200)} alt="" className="order-card__thumb" />
                              <div>
                                {it.productId ? <Link to={`/admin/products/${it.productId}`}>{it.productName}</Link> : <span>{it.productName}</span>}
                                <p>Qty {it.quantity}{it.option ? ` · ${it.option}` : ""} · {formatPrice(it.unitPrice)}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                        {open && o.holdUntil && (
                          <div className={`hold ${soon ? "hold--soon" : ""}`}>
                            <span>
                              Held until {formatDateTime(o.holdUntil)} — {left ? `${left} left` : "releasing shortly"}
                            </span>
                            <button type="button" className="btn btn--sm btn--steel-soft" onClick={() => extend(o)} disabled={busy === o.id}>
                              Extend 7 days
                            </button>
                          </div>
                        )}
                        {o.status === "COMPLETED" && o.paymentMethod && (
                          <p className="order-card__note">
                            💳 Paid by {paymentLabel(o.paymentMethod)} on {formatDate(o.paidAt)}
                            {o.paymentReference ? ` · Ref. ${o.paymentReference}` : ""}
                          </p>
                        )}
                        {o.pickupDate && <p className="order-card__note">Preferred pickup: {formatDate(o.pickupDate)}</p>}
                        {o.note && <p className="order-card__quote">“{o.note}”</p>}
                        <div className="acc__actions">
                          <Link to={`/admin/messages?c=${o.customerId}`} className="btn btn--sm"><MessageCircle size={14} /> Message customer</Link>
                          {o.status === "PENDING" && (
                            <>
                              <button type="button" className="btn btn--sm btn--steel-soft" disabled={busy === o.id} onClick={() => setStatus(o, { status: "CONFIRMED" })}>Confirm</button>
                              <button type="button" className="btn btn--sm btn--danger" disabled={busy === o.id} onClick={() => setCancelling({ order: o, label: "Decline" })}>Decline</button>
                            </>
                          )}
                          {o.status === "CONFIRMED" && (
                            <>
                              <button type="button" className="btn btn--sm btn--steel-soft" disabled={busy === o.id} onClick={() => setStatus(o, { status: "READY_FOR_PICKUP" })}>Mark ready for pickup</button>
                              <button type="button" className="btn btn--sm btn--danger" disabled={busy === o.id} onClick={() => setCancelling({ order: o })}>Cancel</button>
                            </>
                          )}
                          {o.status === "READY_FOR_PICKUP" && (
                            <>
                              <button type="button" className="btn btn--sm btn--solid" disabled={busy === o.id} onClick={() => setCollecting(o)}>Mark as collected</button>
                              <button type="button" className="btn btn--sm btn--danger" disabled={busy === o.id} onClick={() => setCancelling({ order: o })}>Cancel</button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={!!cancelling} onClose={() => setCancelling(null)} eyebrow={cancelling?.label || "Cancel"} title={`Cancel ${cancelling?.order.reference}?`}>
        <p className="modal__text">
          The reserved parts will be returned to stock and {cancelling?.order.customerName} will be notified in their chat.
        </p>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={() => setCancelling(null)}>Keep</button>
          <button
            type="button"
            className="btn btn--danger"
            disabled={busy === cancelling?.order.id}
            onClick={async () => {
              if (await setStatus(cancelling.order, { status: "CANCELLED" })) setCancelling(null);
            }}
          >
            Cancel reservation
          </button>
        </div>
      </Modal>

      <CollectModal
        order={collecting}
        onClose={() => setCollecting(null)}
        onDone={async (order, body) => {
          const ok = await setStatus(order, body);
          if (ok) setCollecting(null);
          return ok;
        }}
      />
    </div>
  );
}
