import { forwardRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useShop } from "../context/ShopContext.jsx";
import { formatPrice, sized } from "../lib/format.js";
import { EASE, Frame, Skeleton, StockBadge } from "./ui.jsx";

const BURST = Array.from({ length: 8 }, (_, i) => i);

/** Heart toggle with a scale pulse and an 8-particle burst when favourited. */
export function HeartButton({ product, size = 18, className = "" }) {
  const { isFavorite, toggleFavorite } = useShop();
  const on = isFavorite(product.id);
  const [burst, setBurst] = useState(0);
  return (
    <button
      type="button"
      className={`heart ${on ? "is-on" : ""} ${className}`.trim()}
      aria-pressed={on}
      aria-label={on ? `Remove ${product.name} from favourites` : `Save ${product.name} to favourites`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!on) setBurst((b) => b + 1);
        toggleFavorite(product);
      }}
    >
      <motion.span
        key={`h${burst}`}
        className="heart__icon"
        animate={burst ? { scale: [1, 1.35, 1] } : undefined}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <Heart size={size} strokeWidth={1.6} fill={on ? "currentColor" : "none"} />
      </motion.span>
      <AnimatePresence>
        {burst > 0 && on && (
          <span className="heart__burst" key={`b${burst}`} aria-hidden="true">
            {BURST.map((i) => (
              <motion.i
                key={i}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{
                  opacity: 0,
                  x: Math.cos((i / 8) * Math.PI * 2) * 22,
                  y: Math.sin((i / 8) * Math.PI * 2) * 22,
                  scale: 0.4,
                }}
                transition={{ duration: 0.6, ease: EASE }}
              />
            ))}
          </span>
        )}
      </AnimatePresence>
    </button>
  );
}

// Forwards its ref so AnimatePresence mode="popLayout" can measure the card.
const ProductCard = forwardRef(function ProductCard({ product, index = 0 }, ref) {
  const { addToCart } = useShop();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const out = product.stock <= 0;
  const hasOptions = product.options?.length > 0;
  const [cover, second] = product.images || [];
  const alt = product.brand ? `${product.name} — ${product.brand}` : product.name;

  const quick = async (e) => {
    e.preventDefault();
    if (hasOptions) {
      navigate(`/product/${product.id}`);
      return;
    }
    setAdding(true);
    await addToCart(product, 1, null);
    setAdding(false);
  };

  return (
    <motion.article
      ref={ref}
      layout
      className={`card ${out ? "card--out" : ""}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.3 } }}
      transition={{ duration: 0.8, ease: EASE, delay: Math.min(index, 8) * 0.06 }}
    >
      <div className="card__top">
      <Link to={`/product/${product.id}`} className="card__media" tabIndex={-1}>
        <Frame src={sized(cover, 700)} alt={alt} className="card__frame" />
        {second && <Frame src={sized(second, 700)} alt="" className="card__frame card__frame--alt" />}
        {product.tag && <span className="card__tag">{product.tag}</span>}
        {out && <span className="card__soldout">Sold out</span>}
      </Link>
      <HeartButton product={product} className="card__heart" />
      {!out && (
        <button type="button" className="card__quick" onClick={quick} disabled={adding}>
          {adding ? "Adding…" : hasOptions ? `Choose ${product.optionLabel.toLowerCase()}` : "Add to bag"}
        </button>
      )}
      </div>
      <div className="card__info">
        <h3 className="card__name">
          <Link to={`/product/${product.id}`}>
            {product.name}
          </Link>
        </h3>
        <p className="card__meta">{product.fitment || product.brand}</p>
        <div className="card__foot">
          <span className="card__price">{formatPrice(product.price)}</span>
          <StockBadge stock={product.stock} />
        </div>
      </div>
    </motion.article>
  );
});

export default ProductCard;

export function CardSkeleton() {
  return (
    <div className="card card--skeleton" aria-hidden="true">
      <Skeleton className="card__skel-media" />
      <Skeleton className="card__skel-line" />
      <Skeleton className="card__skel-line card__skel-line--short" />
    </div>
  );
}
