import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ShoppingBag } from "lucide-react";
import api, { errorMessage } from "../../lib/api.js";
import { SHOP, formatDate, formatPrice, sized, tomorrowISO } from "../../lib/format.js";
import { useShop } from "../../context/ShopContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { EASE, EmptyState, Frame, Modal, Spinner, StockBadge, Stepper } from "../../components/ui.jsx";

const SPARKS = Array.from({ length: 12 }, (_, i) => i);

function SuccessSeal() {
  return (
    <div className="seal" aria-hidden="true">
      {SPARKS.map((i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <motion.i
            key={i}
            className="seal__spark"
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], x: Math.cos(a) * 70, y: Math.sin(a) * 70, scale: 1 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}
          />
        );
      })}
      <motion.span
        className="seal__disc"
        initial={{ scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 16 }}
      >
        <Check size={34} strokeWidth={2} />
      </motion.span>
    </div>
  );
}

export default function Cart() {
  const { cart, updateQuantity, removeItem, loadCart, setCart } = useShop();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pickupDate, setPickupDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    document.title = "Your bag — Rovi Autoparts Surplus";
    loadCart();
  }, [loadCart]);

  const problem = cart.items.some((i) => i.quantity > i.product.stock || !i.product.active);

  const reserve = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/orders/checkout", { note: note.trim() || null, pickupDate: pickupDate || null });
      setCart({ items: [], count: 0, subtotal: 0 });
      setSuccess(data);
      setNote("");
      setPickupDate("");
    } catch (e) {
      toast(errorMessage(e), "error");
      loadCart();
    } finally {
      setBusy(false);
    }
  };

  const closeSuccess = () => {
    setSuccess(null);
    navigate("/orders");
  };

  return (
    <div className="cart">
      <header className="page-hero page-hero--compact container">
        <p className="eyebrow eyebrow--amber">Reserve & collect</p>
        <h1 className="page-hero__title">
          Your <em>Bag</em>
        </h1>
      </header>

      <section className="container">
        {cart.items.length === 0 && !success ? (
          <EmptyState icon={ShoppingBag} title="Your bag is empty — for now." text="Browse the yard and add the parts you'd like us to hold for you.">
            <Link to="/shop" className="btn btn--solid">Explore the shop</Link>
          </EmptyState>
        ) : (
          cart.items.length > 0 && (
            <div className="cart__grid">
              <ul className="cart__items">
                <AnimatePresence initial={false}>
                  {cart.items.map((item) => {
                    const p = item.product;
                    const over = item.quantity > p.stock;
                    const meta = [p.brand, item.option ? `${p.optionLabel}: ${item.option}` : null].filter(Boolean).join(" · ");
                    return (
                      <motion.li
                        key={item.id}
                        layout
                        className="line"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, x: -80, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, transition: { duration: 0.45, ease: EASE } }}
                        transition={{ duration: 0.5, ease: EASE }}
                      >
                        <Link to={`/product/${p.id}`} className="line__thumb" tabIndex={-1} aria-hidden="true">
                          <Frame src={sized(p.images[0], 300)} alt="" />
                        </Link>
                        <div className="line__body">
                          <Link to={`/product/${p.id}`} className="line__name">{p.name}</Link>
                          {meta && <p className="line__meta">{meta}</p>}
                          {over ? <span className="stock-badge stock-badge--out">Only {p.stock} available</span> : <StockBadge stock={p.stock} />}
                          <div className="line__actions">
                            <Stepper size="sm" value={item.quantity} min={1} max={Math.max(1, Math.min(20, Math.max(p.stock, item.quantity)))}
                              onChange={(q) => updateQuantity(item.id, q)} />
                            <button type="button" className="text-btn" onClick={() => removeItem(item.id)}>Remove</button>
                          </div>
                        </div>
                        <div className="line__price">
                          <span>{formatPrice(item.lineTotal)}</span>
                          {item.quantity > 1 && <small>{formatPrice(p.price)} each</small>}
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>

              <aside className="summary" aria-label="Reservation summary">
                <p className="eyebrow">Reservation summary</p>
                <dl className="summary__rows">
                  <div><dt>Parts</dt><dd>{cart.count}</dd></div>
                  <div><dt>Subtotal</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
                  <div><dt>Bench check before release</dt><dd>Included</dd></div>
                  <div className="summary__total"><dt>Total due at pickup</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
                </dl>
                <div className="summary__pickup">
                  <p>📍 Pickup at {SHOP.address}</p>
                  <label className="summary__label" htmlFor="pickup-date">Preferred pickup date (optional)</label>
                  <input id="pickup-date" type="date" className="input" min={tomorrowISO()} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                  <label className="summary__label" htmlFor="pickup-note">Notes for the shop (vehicle make, model, year…)</label>
                  <textarea id="pickup-note" className="input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                {problem && (
                  <p className="summary__warn" role="alert">Some parts exceed what's in stock. Please adjust quantities to continue.</p>
                )}
                <button type="button" className="btn btn--solid btn--block" disabled={busy || problem} onClick={reserve}>
                  {busy ? <><Spinner /> Reserving</> : "Reserve for pickup"}
                </button>
                <p className="summary__note">No payment now. We'll hold your parts and confirm by chat — pay at the shop when you collect.</p>
              </aside>
            </div>
          )
        )}
      </section>

      <Modal open={!!success} onClose={closeSuccess} width={520}>
        {success && (
          <div className="success">
            <SuccessSeal />
            <p className="eyebrow eyebrow--amber">Reservation received</p>
            <h2 className="modal__title">We're holding it <em>for you.</em></h2>
            <p className="success__label">Your reference is</p>
            <p className="success__ref">{success.reference}</p>
            <p className="modal__text">
              Our team will confirm shortly in your chat. Total due at pickup: {formatPrice(success.total)}. We'll hold the
              parts until {formatDate(success.holdUntil)}.
            </p>
            <div className="modal__actions">
              <button type="button" className="btn btn--solid" onClick={closeSuccess}>View reservations</button>
              <button type="button" className="btn" onClick={() => { setSuccess(null); navigate("/shop"); }}>Keep browsing</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
