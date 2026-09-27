import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Search } from "lucide-react";
import api, { errorMessage } from "../../lib/api.js";
import { LOW_STOCK, categoryLabel, compactPeso, formatPrice, sized } from "../../lib/format.js";
import { useToast } from "../../context/ToastContext.jsx";
import { CountUp, EASE, Frame, PageLoader, StockBadge, Stepper } from "../../components/ui.jsx";

const FILTERS = [
  ["all", "All"],
  ["low", "Low stock"],
  ["out", "Sold out"],
  ["healthy", "Healthy"],
];

function StockCell({ product, onSaved }) {
  const { toast } = useToast();
  const [value, setValue] = useState(product.stock);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const dirty = value !== product.stock;

  useEffect(() => setValue(product.stock), [product.stock]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/admin/products/${product.id}/stock`, { stock: value });
      onSaved(data);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch (e) {
      setValue(product.stock);
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stock-cell">
      <Stepper size="sm" value={value} min={0} max={100000} onChange={setValue} label={`Units of ${product.name}`} />
      <AnimatePresence mode="wait" initial={false}>
        {dirty ? (
          <motion.button key="save" type="button" className="btn btn--sm btn--steel-soft" onClick={save} disabled={saving}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3, ease: EASE }}>
            Save
          </motion.button>
        ) : done ? (
          <motion.span key="done" className="stock-cell__done" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}>
            <Check size={16} aria-label="Saved" />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function Inventory() {
  const { refreshCounts } = useOutletContext();
  const [products, setProducts] = useState(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    document.title = "Inventory — Rovi Admin";
    api.get("/admin/products").then(({ data }) => setProducts(data)).catch(() => setProducts([]));
  }, []);

  const totals = useMemo(() => {
    const list = products || [];
    return {
      units: list.reduce((s, p) => s + p.stock, 0),
      value: list.reduce((s, p) => s + p.stock * Number(p.price), 0),
      low: list.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length,
      out: list.filter((p) => p.stock === 0).length,
    };
  }, [products]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (products || [])
      .filter((p) => {
        if (filter === "low" && !(p.stock > 0 && p.stock <= LOW_STOCK)) return false;
        if (filter === "out" && p.stock !== 0) return false;
        if (filter === "healthy" && p.stock <= LOW_STOCK) return false;
        return !term || p.name.toLowerCase().includes(term) || (p.brand || "").toLowerCase().includes(term);
      })
      .sort((a, b) => a.stock - b.stock || a.id - b.id);
  }, [products, filter, q]);

  const onSaved = (p) => {
    setProducts((list) => list.map((x) => (x.id === p.id ? p : x)));
    refreshCounts();
  };

  if (!products) return <PageLoader inline />;

  return (
    <div className="inventory">
      <div className="stat-tiles">
        <div className="stat-tile"><span>Units on hand</span><strong><CountUp value={totals.units} /></strong></div>
        <div className="stat-tile"><span>Value at current prices</span><strong><CountUp value={totals.value} format={compactPeso} /></strong></div>
        <div className="stat-tile"><span>Low stock</span><strong><CountUp value={totals.low} /></strong></div>
        <div className="stat-tile"><span>Sold out</span><strong><CountUp value={totals.out} /></strong></div>
      </div>

      <div className="toolbar">
        <div className="pills" role="tablist" aria-label="Filter">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} className={`pill ${filter === k ? "is-active" : ""}`} onClick={() => setFilter(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="search-box">
          <Search size={16} aria-hidden="true" />
          <label htmlFor="inv-search" className="sr-only">Find a part</label>
          <input id="inv-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a part" />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="panel__empty">No parts in this view.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Part</th><th>Category</th><th>Price</th><th>Status</th><th>Units available</th><th>Value</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={p.stock === 0 ? "row--out" : p.stock <= LOW_STOCK ? "row--low" : ""}>
                  <td>
                    <div className="table__part">
                      <Frame src={sized(p.images[0], 120)} alt="" className="table__thumb" />
                      <div>
                        <Link to={`/admin/products/${p.id}`}>{p.name}</Link>
                        <small>{p.active ? "Live" : "Hidden"}</small>
                      </div>
                    </div>
                  </td>
                  <td>{categoryLabel(p.category)}</td>
                  <td>{formatPrice(p.price)}</td>
                  <td><StockBadge stock={p.stock} /></td>
                  <td><StockCell product={p} onSaved={onSaved} /></td>
                  <td>{formatPrice(p.stock * Number(p.price))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
