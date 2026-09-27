import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Pencil, Plus, Rows3, Search, Star, Trash2, PackageOpen } from "lucide-react";
import api, { errorMessage } from "../../lib/api.js";
import { CATEGORIES, LOW_STOCK, categoryLabel, formatPrice, sized } from "../../lib/format.js";
import { useToast } from "../../context/ToastContext.jsx";
import { EASE, EmptyState, Frame, Modal, PageLoader, Spinner, StockBadge, Toggle } from "../../components/ui.jsx";

const VIEW_KEY = "ra_admin_view";

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === "table" ? "table" : "grid";
  } catch {
    return "grid";
  }
}

export default function Products() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshCounts } = useOutletContext();
  const [products, setProducts] = useState(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState(readView);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Parts — Rovi Admin";
    api.get("/admin/products").then(({ data }) => setProducts(data)).catch(() => setProducts([]));
  }, []);

  const changeView = (v) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // storage unavailable: keep it for this visit only
    }
  };

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (products || []).filter((p) => {
      if (category && p.category !== category) return false;
      if (status === "live" && !p.active) return false;
      if (status === "hidden" && p.active) return false;
      if (status === "featured" && !p.featured) return false;
      if (status === "low" && p.stock > LOW_STOCK) return false;
      if (!term) return true;
      return [p.name, p.brand, p.fitment, p.partNumber, p.tag].some((f) => f && f.toLowerCase().includes(term));
    });
  }, [products, q, category, status]);

  const replace = (p) => setProducts((list) => list.map((x) => (x.id === p.id ? p : x)));

  const setVisibility = async (p, change) => {
    try {
      const { data } = await api.patch(`/admin/products/${p.id}/visibility`, change);
      replace(data);
      if ("active" in change) toast(data.active ? `${data.name} is now live` : `${data.name} is hidden from customers`);
      else toast(data.featured ? `${data.name} featured on the home page` : `${data.name} removed from featured`);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/admin/products/${deleting.id}`);
      setProducts((list) => list.filter((x) => x.id !== deleting.id));
      toast(`${deleting.name} was deleted`);
      setDeleting(null);
      refreshCounts();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const hideInstead = async () => {
    const p = deleting;
    setDeleting(null);
    if (p.active) await setVisibility(p, { active: false });
  };

  if (!products) return <PageLoader inline />;

  return (
    <div className="admin-products">
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} aria-hidden="true" />
          <label htmlFor="parts-search" className="sr-only">Search parts</label>
          <input id="parts-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, brand, vehicle, part no…" />
        </div>
        <label className="sort">
          <span className="sr-only">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>
        <label className="sort">
          <span className="sr-only">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="live">Live</option>
            <option value="hidden">Hidden</option>
            <option value="featured">Featured</option>
            <option value="low">Low / sold out</option>
          </select>
        </label>
        <div className="segmented" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "grid"} className={view === "grid" ? "is-active" : ""} onClick={() => changeView("grid")} aria-label="Grid view">
            <LayoutGrid size={16} />
          </button>
          <button type="button" aria-pressed={view === "table"} className={view === "table" ? "is-active" : ""} onClick={() => changeView("table")} aria-label="Table view">
            <Rows3 size={16} />
          </button>
        </div>
        <Link to="/admin/products/new" className="btn btn--solid btn--sm"><Plus size={14} /> Add part</Link>
      </div>
      <p className="toolbar__count">{shown.length} of {products.length} parts</p>

      {shown.length === 0 ? (
        products.length === 0 ? (
          <EmptyState icon={PackageOpen} title="Your catalogue is empty." text="Upload your first part — customers will see it the moment it's live.">
            <Link to="/admin/products/new" className="btn btn--solid">Add a part</Link>
          </EmptyState>
        ) : (
          <EmptyState icon={Search} title="No parts match." text="Try another search, category or status." />
        )
      ) : view === "grid" ? (
        <motion.div layout className="aparts-grid">
          <AnimatePresence mode="popLayout">
            {shown.map((p, i) => (
              <motion.article
                key={p.id}
                layout
                className={`apart ${p.active ? "" : "is-hidden"}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 8) * 0.04 }}
              >
                <Link to={`/admin/products/${p.id}`} className="apart__media">
                  <Frame src={sized(p.images[0], 500)} alt={p.name} />
                  <span className="apart__flags">
                    {!p.active && <span className="chip chip--mute">Hidden</span>}
                    {p.featured && <span className="chip chip--amber">★ Featured</span>}
                  </span>
                  <span className="apart__edit"><Pencil size={13} /> Edit</span>
                </Link>
                <div className="apart__body">
                  <p className="eyebrow">{categoryLabel(p.category)}</p>
                  <Link to={`/admin/products/${p.id}`} className="apart__name">{p.name}</Link>
                  <div className="apart__row">
                    <span className="apart__price">{formatPrice(p.price)}</span>
                    <StockBadge stock={p.stock} />
                  </div>
                </div>
                <div className="apart__foot">
                  <Toggle size="sm" checked={p.active} onChange={(v) => setVisibility(p, { active: v })} label={p.active ? `Hide ${p.name}` : `Publish ${p.name}`} />
                  <span className="apart__live">{p.active ? "Live" : "Hidden"}</span>
                  <button type="button" className={`icon-btn apart__star ${p.featured ? "is-on" : ""}`} aria-pressed={p.featured}
                    aria-label={p.featured ? `Remove ${p.name} from featured` : `Feature ${p.name}`} onClick={() => setVisibility(p, { featured: !p.featured })}>
                    <Star size={16} fill={p.featured ? "currentColor" : "none"} />
                  </button>
                  <button type="button" className="icon-btn icon-btn--danger" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Part</th><th>Category</th><th>Price</th><th>Stock</th><th>Live</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className={p.active ? "" : "is-hidden"}>
                  <td>
                    <div className="table__part">
                      <Frame src={sized(p.images[0], 120)} alt="" className="table__thumb" />
                      <div>
                        <Link to={`/admin/products/${p.id}`}>{p.name}</Link>
                        <small>{p.brand}</small>
                      </div>
                    </div>
                  </td>
                  <td>{categoryLabel(p.category)}</td>
                  <td>{formatPrice(p.price)}</td>
                  <td><StockBadge stock={p.stock} /> <span className="table__num">{p.stock}</span></td>
                  <td><Toggle size="sm" checked={p.active} onChange={(v) => setVisibility(p, { active: v })} label={p.active ? `Hide ${p.name}` : `Publish ${p.name}`} /></td>
                  <td className="table__actions">
                    <button type="button" className="icon-btn" aria-label={`Edit ${p.name}`} onClick={() => navigate(`/admin/products/${p.id}`)}><Pencil size={16} /></button>
                    <button type="button" className="icon-btn icon-btn--danger" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!deleting} onClose={() => !busy && setDeleting(null)} eyebrow="Delete part" title={`Delete ${deleting?.name}?`}>
        <p className="modal__text">
          It will disappear from the shop, customers' bags and saved lists. Past reservations keep their record. This can't
          be undone — to take it off sale temporarily, hide it instead.
        </p>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={hideInstead} disabled={busy}>Hide instead</button>
          <button type="button" className="btn btn--danger" onClick={remove} disabled={busy}>
            {busy ? <Spinner /> : null} Delete permanently
          </button>
        </div>
      </Modal>
    </div>
  );
}
