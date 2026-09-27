import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight, Boxes, Cog, MessagesSquare, Package, Plus, Users, Wallet, DatabaseZap } from "lucide-react";
import api, { errorMessage } from "../../lib/api.js";
import {
  ORDER_STATUS, categoryLabel, compactPeso, firstName, formatDate, formatPrice, greeting, plural, sized,
} from "../../lib/format.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { Chip, CountUp, EASE, EmptyState, Frame, PageLoader, StockBadge } from "../../components/ui.jsx";

function CategoryChart({ data }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const max = Math.max(1, ...data.map((d) => d.units));
  const [tip, setTip] = useState(null);
  return (
    <div ref={ref} className="chart">
      <ul className="chart__bars" aria-hidden="true">
        {data.map((d, i) => (
          <li
            key={d.category}
            className="chart__row"
            tabIndex={0}
            onMouseEnter={() => setTip(d.category)}
            onMouseLeave={() => setTip(null)}
            onFocus={() => setTip(d.category)}
            onBlur={() => setTip(null)}
          >
            <span className="chart__label">{categoryLabel(d.category)}</span>
            <span className="chart__track">
              <motion.span
                className="chart__fill"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: inView ? d.units / max : 0 }}
                transition={{ duration: 1.1, ease: EASE, delay: i * 0.06 }}
              />
            </span>
            <span className="chart__value">{d.units}</span>
            {tip === d.category && (
              <span className="chart__tip" role="tooltip">
                {d.units} units · {plural(d.products, "part")} · {formatPrice(d.value)} at current prices
              </span>
            )}
          </li>
        ))}
      </ul>
      <table className="sr-only">
        <caption>Units in stock by category</caption>
        <thead>
          <tr><th scope="col">Category</th><th scope="col">Units</th><th scope="col">Parts</th><th scope="col">Value</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.category}>
              <th scope="row">{categoryLabel(d.category)}</th>
              <td>{d.units}</td>
              <td>{d.products}</td>
              <td>{formatPrice(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshCounts } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    document.title = "Dashboard — Rovi Admin";
    load();
  }, [load]);

  const restock = async (p, add) => {
    try {
      const { data } = await api.patch(`/admin/products/${p.id}/stock`, { stock: p.stock + add });
      toast(`${data.name} restocked to ${data.stock}`);
      load();
      refreshCounts();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  if (failed) {
    return (
      <EmptyState icon={DatabaseZap} title="The dashboard didn't load." text="The connection to the database may have been slow. Your data is safe.">
        <button type="button" className="btn btn--solid" onClick={load}>Try again</button>
      </EmptyState>
    );
  }
  if (!stats) return <PageLoader inline />;

  const kpis = [
    { icon: Cog, label: "Parts published", value: stats.activeProducts, sub: `${stats.products} in catalogue`, to: "/admin/products" },
    { icon: Boxes, label: "Units in stock", value: stats.totalUnits, sub: `${stats.lowStock} low · ${stats.soldOut} sold out`, to: "/admin/inventory" },
    { icon: Wallet, label: "Inventory value", value: stats.inventoryValue, money: true, sub: "At current prices", to: "/admin/inventory" },
    { icon: Package, label: "Open reservations", value: stats.openOrders, sub: `${stats.pendingOrders} awaiting confirmation`, to: "/admin/orders" },
    { icon: Users, label: "Customers", value: stats.customers, sub: "Registered customers", to: "/admin/customers" },
    { icon: MessagesSquare, label: "Unread messages", value: stats.unreadMessages, sub: "From customers", to: "/admin/messages" },
  ];

  return (
    <div className="dash">
      <section className="dash-hero">
        <div>
          <p className="eyebrow eyebrow--light">{greeting()}, {firstName(user.fullName)}</p>
          <h2 className="dash-hero__title">The yard <em>today.</em></h2>
          <p className="dash-hero__text">
            {stats.pendingOrders > 0
              ? `${plural(stats.pendingOrders, "reservation")} waiting for your confirmation.`
              : "Every reservation is up to date."}{" "}
            {plural(stats.unreadMessages, "unread message")}.
          </p>
        </div>
        <div className="dash-hero__side">
          <p className="eyebrow eyebrow--light">Completed sales</p>
          <p className="dash-hero__value"><CountUp value={stats.revenue} format={compactPeso} /></p>
          <div className="dash-hero__actions">
            <Link to="/admin/products/new" className="btn btn--amber btn--sm"><Plus size={14} /> New part</Link>
            <Link to="/admin/orders" className="btn btn--light btn--sm">Reservations</Link>
          </div>
        </div>
      </section>

      <div className="kpis">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: i * 0.06 }}>
              <Link to={k.to} className="kpi">
                <span className="kpi__icon"><Icon size={18} strokeWidth={1.6} /></span>
                <span className="kpi__label">{k.label}</span>
                <span className="kpi__value">
                  <CountUp value={k.value} format={k.money ? compactPeso : undefined} />
                </span>
                <span className="kpi__sub">{k.sub}</span>
                <ArrowUpRight className="kpi__arrow" size={16} aria-hidden="true" />
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="panels">
        <section className="panel">
          <header className="panel__head">
            <h3>Units in stock by category</h3>
            <Link to="/admin/inventory" className="link-line">Manage</Link>
          </header>
          <CategoryChart data={stats.byCategory} />
        </section>

        <section className="panel">
          <header className="panel__head">
            <h3>Low & sold out</h3>
            <Link to="/admin/inventory" className="link-line">Inventory</Link>
          </header>
          {stats.lowStockProducts.length === 0 ? (
            <p className="panel__empty">Everything is well stocked.</p>
          ) : (
            <ul className="low-list">
              {stats.lowStockProducts.map((p) => (
                <li key={p.id}>
                  <Frame src={sized(p.images[0], 160)} alt="" className="low-list__thumb" />
                  <div className="low-list__body">
                    <Link to={`/admin/products/${p.id}`}>{p.name}</Link>
                    <StockBadge stock={p.stock} />
                  </div>
                  <div className="low-list__actions">
                    <button type="button" className="btn btn--sm btn--steel-soft" onClick={() => restock(p, 1)} aria-label={`Add 1 to ${p.name}`}>+1</button>
                    <button type="button" className="btn btn--sm btn--steel-soft" onClick={() => restock(p, 5)} aria-label={`Add 5 to ${p.name}`}>+5</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel panel--wide">
          <header className="panel__head">
            <h3>Recent reservations</h3>
            <Link to="/admin/orders" className="link-line">All reservations</Link>
          </header>
          {stats.recentOrders.length === 0 ? (
            <p className="panel__empty">No reservations yet — they'll appear here as customers reserve parts.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Reference</th><th>Customer</th><th>Parts</th><th>Placed</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="table__ref">{o.reference}</td>
                      <td>{o.customerName}</td>
                      <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td>{formatPrice(o.total)}</td>
                      <td><Chip tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].short}</Chip></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
