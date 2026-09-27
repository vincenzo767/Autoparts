import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import api from "../../lib/api.js";
import { formatPrice } from "../../lib/format.js";
import { useShop } from "../../context/ShopContext.jsx";
import ProductCard, { CardSkeleton } from "../../components/ProductCard.jsx";
import { EmptyState } from "../../components/ui.jsx";

export default function Favorites() {
  const { favorites } = useShop();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    document.title = "Saved parts — Rovi Autoparts Surplus";
    api.get("/favorites").then(({ data }) => setProducts(data)).catch(() => setProducts([]));
  }, []);

  // Un-hearting removes the card straight away.
  const shown = useMemo(() => (products || []).filter((p) => favorites.has(p.id)), [products, favorites]);
  const total = shown.reduce((sum, p) => sum + Number(p.price), 0);

  return (
    <div className="favorites">
      <header className="page-hero container">
        <p className="eyebrow eyebrow--amber">Your saved parts</p>
        <h1 className="page-hero__title">
          Saved <em>for later</em>
        </h1>
        <div className="page-hero__meta">
          <p>Parts you're keeping an eye on. Surplus stock is often one of a kind — reserve the ones you need.</p>
          {products && <p className="page-hero__count">{shown.length} saved · {formatPrice(total)}</p>}
        </div>
      </header>
      <section className="container shop__results">
        {products === null ? (
          <div className="grid grid--3">
            {Array.from({ length: 3 }, (_, n) => <CardSkeleton key={n} />)}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState icon={Heart} title="Nothing saved yet." text="Tap the heart on any part to keep it here for later.">
            <Link to="/shop" className="btn btn--solid">Browse the shop</Link>
          </EmptyState>
        ) : (
          <motion.div layout className="grid grid--3">
            <AnimatePresence mode="popLayout">
              {shown.map((p, n) => (
                <ProductCard key={p.id} product={p} index={n} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </div>
  );
}
