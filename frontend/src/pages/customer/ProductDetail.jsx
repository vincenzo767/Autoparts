import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bell, MessageCircle, PackageSearch } from "lucide-react";
import api from "../../lib/api.js";
import { SHOP, categoryLabel, formatPrice, hoursLine, originLabel, sized } from "../../lib/format.js";
import { useShop } from "../../context/ShopContext.jsx";
import ProductCard, { HeartButton } from "../../components/ProductCard.jsx";
import { EASE, EmptyState, PageLoader, Reveal, SplitTitle, Stepper, StockMeter } from "../../components/ui.jsx";

function Gallery({ product }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(null);
  const box = useRef(null);
  const images = product.images || [];
  const alt = product.brand ? `${product.name} — ${product.brand}` : product.name;

  const onMove = (e) => {
    const r = box.current.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className="gallery">
      {images.length > 1 && (
        <div className="gallery__thumbs" role="tablist" aria-label="Photos">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Photo ${i + 1}`}
              className={`gallery__thumb ${i === active ? "is-active" : ""}`}
              onClick={() => setActive(i)}
            >
              <img src={sized(src, 200)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <div
        ref={box}
        className={`gallery__main ${zoom ? "is-zooming" : ""}`}
        onMouseEnter={onMove}
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
      >
        <AnimatePresence initial={false}>
          <motion.img
            key={images[active]}
            src={sized(images[active], 1600)}
            alt={alt}
            className="gallery__img"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: zoom ? 2 : 1 }}
            exit={{ opacity: 0 }}
            style={zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            transition={{ opacity: { duration: 0.6, ease: EASE }, scale: { duration: 0.4, ease: EASE } }}
          />
        </AnimatePresence>
        <span className="gallery__hint" aria-hidden="true">{zoom ? "Move to explore" : "Hover to zoom"}</span>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useShop();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [missing, setMissing] = useState(false);
  const [qty, setQty] = useState(1);
  const [option, setOption] = useState(null);
  const [optionError, setOptionError] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setProduct(null);
    setMissing(false);
    setQty(1);
    setOption(null);
    setOptionError(false);
    api
      .get(`/products/${id}`)
      .then(({ data }) => {
        setProduct(data);
        document.title = `${data.name} — Rovi Autoparts Surplus`;
      })
      .catch(() => setMissing(true));
    api.get(`/products/${id}/related`).then(({ data }) => setRelated(data)).catch(() => setRelated([]));
  }, [id]);

  if (missing) {
    return (
      <div className="container section">
        <EmptyState icon={PackageSearch} title="This part has moved on." text="It may have been sold or taken off the shelf.">
          <Link to="/shop" className="btn btn--solid">Browse the shop</Link>
        </EmptyState>
      </div>
    );
  }
  if (!product) return <PageLoader inline />;

  const out = product.stock <= 0;
  const hasOptions = product.options.length > 0;
  const max = Math.max(1, Math.min(product.stock, 20));
  const specs = [
    ["Brand", product.brand],
    ["Fits", product.fitment],
    ["Part no.", product.partNumber],
    ["Condition", product.condition],
    ["Origin", originLabel(product.origin)],
  ].filter(([, v]) => v);

  const add = async () => {
    if (hasOptions && !option) {
      setOptionError(true);
      return;
    }
    setAdding(true);
    await addToCart(product, qty, option);
    setAdding(false);
  };

  const ask = () => navigate("/chat", { state: { product } });

  return (
    <div className="pdp">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/shop">Shop</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/shop?category=${product.category}`}>{categoryLabel(product.category)}</Link>
          <span aria-hidden="true">/</span>
          <em aria-current="page">{product.name}</em>
        </nav>

        <div className="pdp__grid">
          <Gallery product={product} />

          <motion.div className="pdp__info" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}>
            <p className="eyebrow eyebrow--amber">
              {categoryLabel(product.category)}
              {product.tag ? ` · ${product.tag}` : ""}
            </p>
            <h1 className="pdp__name">{product.name}</h1>
            <p className="pdp__price">{formatPrice(product.price)}</p>
            <StockMeter stock={product.stock} />
            {product.description && <p className="pdp__desc">{product.description}</p>}

            {specs.length > 0 && (
              <dl className="specs">
                {specs.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            {hasOptions && (
              <fieldset className={`options ${optionError ? "options--error" : ""}`}>
                <legend>
                  {product.optionLabel}
                  {optionError && <span className="options__error"> — please choose one</span>}
                </legend>
                <div className="options__list">
                  {product.options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={option === o}
                      className={`option ${option === o ? "is-active" : ""}`}
                      onClick={() => {
                        setOption(o);
                        setOptionError(false);
                      }}
                    >
                      {option === o && <motion.span layoutId="option-hl" className="option__hl" transition={{ type: "spring", stiffness: 480, damping: 34 }} />}
                      <span>{o}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="buy">
              {!out && <Stepper value={qty} min={1} max={max} onChange={setQty} />}
              <button type="button" className="btn btn--solid buy__add" onClick={add} disabled={out || adding}>
                {out ? "Sold out" : adding ? "Adding…" : "Add to bag"}
              </button>
              <HeartButton product={product} size={22} className="buy__heart" />
            </div>

            <button type="button" className="link-line pdp__ask" onClick={ask}>
              {out ? <Bell size={15} /> : <MessageCircle size={15} />}
              {out ? "Ask us to notify you when it's back" : "Ask about fitment for this part"}
              <ArrowRight size={14} />
            </button>

            <ul className="assurance">
              <li>Inspected & graded</li>
              <li>Fitment check by chat</li>
              <li>Reserve & collect in Cebu City</li>
            </ul>

            <div className="accordion">
              <details open>
                <summary>How reservations work</summary>
                <p>
                  Add parts to your bag and reserve them online — we'll hold them for you and confirm by chat. Pay and
                  collect at {SHOP.address}, {hoursLine()}.
                </p>
              </details>
              <details>
                <summary>Condition grades</summary>
                <p>
                  Grade A — clean and fully working, tested where possible. Grade B — working with normal wear or cosmetic
                  marks. Tire tread is shown as a percentage of new.
                </p>
              </details>
              <details>
                <summary>Fitment & returns</summary>
                <p>
                  Not sure it fits? Send us your vehicle's make, model and year before you reserve. Check the part at
                  pickup; ask us about our check-warranty terms.
                </p>
              </details>
            </div>
          </motion.div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section container">
          <div className="section-head">
            <div>
              <Reveal as="p" className="eyebrow eyebrow--amber">You may also need</Reveal>
              <SplitTitle lines={[<>More <em>{categoryLabel(product.category)}</em></>]} />
            </div>
            <Link to={`/shop?category=${product.category}`} className="link-line">View all <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid--4">
            {related.map((p, n) => (
              <ProductCard key={p.id} product={p} index={n} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
