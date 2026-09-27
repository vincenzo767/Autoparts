import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, Package } from "lucide-react";
import api, { errorMessage } from "../../lib/api.js";
import {
  ORDER_STATUS, formatDate, formatDateTime, formatPrice, paymentLabel, sized, timeLeft,
} from "../../lib/format.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useShop } from "../../context/ShopContext.jsx";
import { Chip, EASE, EmptyState, Frame, Modal, PageLoader, Spinner, StatusTimeline } from "../../components/ui.jsx";

export default function Orders() {
  const { toast } = useToast();
  const { loadCart } = useShop();
  const [orders, setOrders] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/orders").then(({ data }) => setOrders(data)).catch(() => setOrders([]));

  useEffect(() => {
    document.title = "Reservations — Rovi Autoparts Surplus";
    load();
  }, []);

  const cancel = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/orders/${cancelling.id}/cancel`);
      setOrders((list) => list.map((o) => (o.id === data.id ? data : o)));
      toast("Reservation cancelled — the parts have been released.");
      setCancelling(null);
      loadCart();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="orders">
      <header className="page-hero page-hero--compact container">
        <p className="eyebrow eyebrow--amber">Held for you</p>
        <h1 className="page-hero__title">
          Reser<em>vations</em>
        </h1>
      </header>
      <section className="container orders__list">
        {orders === null ? (
          <PageLoader inline />
        ) : orders.length === 0 ? (
          <EmptyState icon={Package} title="No reservations yet." text="When you reserve parts from your bag, you'll follow them to pickup here.">
            <Link to="/shop" className="btn btn--solid">Start browsing</Link>
          </EmptyState>
        ) : (
          orders.map((o, n) => {
            const status = ORDER_STATUS[o.status];
            const open = ["PENDING", "CONFIRMED", "READY_FOR_PICKUP"].includes(o.status);
            const left = timeLeft(o.holdUntil);
            return (
              <motion.article
                key={o.id}
                className="order-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE, delay: Math.min(n, 8) * 0.06 }}
              >
                <div className="order-card__head">
                  <div>
                    <p className="eyebrow">Reference</p>
                    <p className="order-card__ref">{o.reference}</p>
                    <p className="order-card__dates">
                      Placed {formatDate(o.createdAt)}
                      {o.pickupDate ? ` · Pickup ${formatDate(o.pickupDate)}` : ""}
                    </p>
                  </div>
                  <p className="order-card__total">{formatPrice(o.total)}</p>
                </div>
                <StatusTimeline status={o.status} />
                <ul className="order-card__items">
                  {o.items.map((it, i) => (
                    <li key={i}>
                      <Frame src={sized(it.imageUrl, 200)} alt="" className="order-card__thumb" />
                      <div>
                        {it.productId ? <Link to={`/product/${it.productId}`}>{it.productName}</Link> : <span>{it.productName}</span>}
                        <p>
                          Qty {it.quantity}
                          {it.option ? ` · ${it.option}` : ""} · {formatPrice(it.unitPrice)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {open && o.holdUntil && (
                  <p className="order-card__note">
                    🕒 We're holding these parts for you until {formatDateTime(o.holdUntil)}
                    {left ? ` (${left} left)` : ""}. Need more time? Just message us.
                  </p>
                )}
                {o.status === "COMPLETED" && o.paymentMethod && (
                  <p className="order-card__note">
                    💳 Paid by {paymentLabel(o.paymentMethod)} on {formatDate(o.paidAt)}
                    {o.paymentReference ? ` · Ref. ${o.paymentReference}` : ""}
                  </p>
                )}
                {o.note && <p className="order-card__quote">“{o.note}”</p>}
                <div className="order-card__foot">
                  <Chip tone={status.tone}>{status.label}</Chip>
                  <div className="order-card__actions">
                    <Link to="/chat" className="btn btn--sm"><MessageCircle size={14} /> Message us</Link>
                    {(o.status === "PENDING" || o.status === "CONFIRMED") && (
                      <button type="button" className="btn btn--sm btn--danger" onClick={() => setCancelling(o)}>
                        Cancel reservation
                      </button>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })
        )}
      </section>

      <Modal open={!!cancelling} onClose={() => !busy && setCancelling(null)} eyebrow="Cancel reservation" title="Release these parts?">
        <p className="modal__text">
          Reservation {cancelling?.reference} will be cancelled and the parts returned to stock for other customers.
        </p>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={() => setCancelling(null)} disabled={busy}>Keep it</button>
          <button type="button" className="btn btn--danger" onClick={cancel} disabled={busy}>
            {busy ? <Spinner /> : null} Cancel reservation
          </button>
        </div>
      </Modal>
    </div>
  );
}
