import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Search, SearchX, X } from "lucide-react";
import api from "../../lib/api.js";
import { CATEGORIES, categoryLabel } from "../../lib/format.js";
import ProductCard, { CardSkeleton } from "../../components/ProductCard.jsx";
import { EASE, EmptyState, Toggle } from "../../components/ui.jsx";

const SORTS = [
  { key: "featured", label: "Featured" },
  { key: "new", label: "Newest" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "name", label: "Name A–Z" },
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const sort = params.get("sort") || "featured";
  const inStock = params.get("inStock") === "1";
  const q = params.get("q") || "";
  const [search, setSearch] = useState(q);
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const req = useRef(0);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => {
      if (v === "" || v === null || v === undefined || v === false || (k === "sort" && v === "featured")) next.delete(k);
      else next.set(k, v === true ? "1" : v);
    });
    setParams(next, { replace: true });
  };

  // Keep the box in sync when q changes from outside (search overlay, chips).
  useEffect(() => setSearch(q), [q]);

  // Debounce typing into q.
  useEffect(() => {
    if (search === q) return undefined;
    const t = setTimeout(() => update({ q: search.trim() }), 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = `${category ? categoryLabel(category) : "Shop"} — Rovi Autoparts Surplus`;
  }, [category]);

  useEffect(() => {
    const id = ++req.current;
    setLoading(true);
    api
      .get("/products", { params: { category: category || undefined, sort, inStock: inStock || undefined, q: q || undefined } })
      .then(({ data }) => id === req.current && setProducts(data))
      .catch(() => id === req.current && setProducts([]))
      .finally(() => id === req.current && setLoading(false));
  }, [category, sort, inStock, q]);

  const reset = () => {
    setSearch("");
    setParams({}, { replace: true });
  };

  return (
    <div className="shop">
      <header className="page-hero container">
        <p className="eyebrow eyebrow--amber">The Yard · Updated daily</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={category || "all"}
            className="page-hero__title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            {category ? <em>{categoryLabel(category)}</em> : <>All <em>Parts</em></>}
          </motion.h1>
        </AnimatePresence>
        <div className="page-hero__meta">
          <p>Every part below is inspected and graded at our Cebu City shop and available to reserve for pickup.</p>
          <p className="page-hero__count">
            {loading || products === null ? "Loading…" : `${products.length} part${products.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </header>

      <div className="filters">
        <div className="filters__inner container">
          <LayoutGroup id="cats">
            <div className="chips-scroll" role="tablist" aria-label="Categories">
              {[{ key: "", label: "All" }, ...CATEGORIES].map((c) => {
                const active = category === c.key;
                return (
                  <button
                    key={c.key || "all"}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`cat-chip ${active ? "is-active" : ""}`}
                    onClick={() => update({ category: c.key })}
                  >
                    {c.label}
                    {active && <motion.span layoutId="cat-underline" className="cat-chip__line" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
          <div className="filters__right">
            <div className="search-box">
              <Search size={16} aria-hidden="true" />
              <label htmlFor="shop-search" className="sr-only">Search parts, brands, vehicles</label>
              <input
                id="shop-search"
                value={search}
                maxLength={60}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search parts, brands, vehicles"
              />
              {search && (
                <button type="button" className="icon-btn" onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={15} />
                </button>
              )}
            </div>
            <Toggle checked={inStock} onChange={(v) => update({ inStock: v })} label="In stock" />
            <label className="sort">
              <span className="sr-only">Sort by</span>
              <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <section className="container shop__results">
        {q && (
          <p className="shop__note">
            Showing results for “{q}” —{" "}
            <button type="button" className="text-btn text-btn--strong" onClick={() => { setSearch(""); update({ q: "" }); }}>
              Clear
            </button>
          </p>
        )}
        {products === null ? (
          <div className="grid grid--3">
            {Array.from({ length: 6 }, (_, n) => <CardSkeleton key={n} />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nothing matches — yet."
            text="Try another search or category, or message us your vehicle details and we'll search the yard for you."
          >
            <button type="button" className="btn btn--solid" onClick={reset}>Reset filters</button>
          </EmptyState>
        ) : (
          <motion.div layout className={`grid grid--3 ${loading ? "is-loading" : ""}`} aria-busy={loading}>
            <AnimatePresence mode="popLayout">
              {products.map((p, n) => (
                <ProductCard key={p.id} product={p} index={n} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </div>
  );
}
