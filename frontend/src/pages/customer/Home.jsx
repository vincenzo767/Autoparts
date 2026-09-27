import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, ArrowRight, Cog } from "lucide-react";
import api from "../../lib/api.js";
import { CATEGORIES, IMAGES, SHOP, firstName, formatPrice, greeting, hoursLine, sized } from "../../lib/format.js";
import { useAuth } from "../../context/AuthContext.jsx";
import ProductCard, { CardSkeleton } from "../../components/ProductCard.jsx";
import { EASE, Frame, Reveal, SplitTitle } from "../../components/ui.jsx";

const MARQUEE = [
  "Japan & Korea surplus",
  "Bench-tested before release",
  "Fitment checked by chat",
  "Honest condition grades",
  "Lifetime of know-how since 1998",
  "Reserve online, pick up in store",
];

export function Marquee({ items }) {
  const row = (hidden) => (
    <ul className="marquee__row" aria-hidden={hidden || undefined}>
      {items.map((t) => (
        <li key={t}>
          {t}
          <span className="marquee__dot" aria-hidden="true">✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="marquee">
      <div className="marquee__track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

function Hero({ featured, user }) {
  const slides = featured.slice(0, 5);
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  const current = slides[i];
  const image = current ? sized(current.images[0], 1800) : IMAGES.hero;

  return (
    <section className="hero" ref={ref}>
      <motion.div className="hero__media" style={{ y: imgY }}>
        <AnimatePresence initial={false}>
          <motion.img
            key={image}
            src={image}
            alt=""
            className="hero__img"
            initial={{ opacity: 0, scale: 1.14 }}
            animate={{ opacity: 1, scale: 1, transition: { opacity: { duration: 1.4, ease: EASE }, scale: { duration: 9, ease: "linear" } } }}
            exit={{ opacity: 0, transition: { duration: 1.4, ease: EASE } }}
          />
        </AnimatePresence>
      </motion.div>
      <div className="hero__shade" aria-hidden="true" />
      <motion.div className="hero__content container" style={{ opacity: contentOpacity }}>
        <motion.p className="eyebrow eyebrow--light" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.5 }}>
          {greeting()}, {firstName(user?.fullName)}
        </motion.p>
        <SplitTitle as="h1" className="hero__title" delay={0.6} lines={["Built once,", <em key="e">driven again.</em>]} />
        <motion.p className="hero__sub" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE, delay: 1 }}>
          Fresh surplus from Japan and Korea just landed. Reserve online and pick up at our Cebu City shop.
        </motion.p>
        <motion.div className="hero__ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE, delay: 1.15 }}>
          <Link to="/shop" className="btn btn--amber">Shop all parts</Link>
          <Link to="/visit" className="btn btn--light">Visit the shop</Link>
        </motion.div>
      </motion.div>
      <div className="hero__foot container">
        <div className="hero__now">
          <span className="eyebrow eyebrow--light">Now showing</span>
          {current ? (
            <Link to={`/product/${current.id}`} className="hero__now-link">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5, ease: EASE }}>
                  {current.name} · {formatPrice(current.price)}
                </motion.span>
              </AnimatePresence>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <span className="hero__now-link">The Yard</span>
          )}
        </div>
        {slides.length > 1 && (
          <div className="hero__dots" role="tablist" aria-label="Featured parts">
            {slides.map((s, n) => (
              <button key={s.id} type="button" role="tab" aria-selected={n === i} aria-label={s.name} className={n === i ? "is-active" : ""} onClick={() => setI(n)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [products, setProducts] = useState(null);
  const rail = useRef(null);

  useEffect(() => {
    document.title = "Home — Rovi Autoparts Surplus";
    api.get("/products", { params: { sort: "new" } }).then(({ data }) => setProducts(data)).catch(() => setProducts([]));
  }, []);

  const featured = useMemo(() => (products || []).filter((p) => p.featured), [products]);
  const newest = useMemo(() => (products || []).slice(0, 4), [products]);
  const counts = useMemo(() => {
    const c = {};
    (products || []).forEach((p) => (c[p.category] = (c[p.category] || 0) + 1));
    return c;
  }, [products]);

  const scrollRail = (dir) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector(".card");
    const gap = parseFloat(getComputedStyle(el).columnGap || "24") || 24;
    el.scrollBy({ left: dir * ((card?.offsetWidth || 300) + gap), behavior: "smooth" });
  };

  return (
    <div className="home">
      <Hero featured={featured} user={user} />

      <section className="section container">
        <div className="section-head">
          <div>
            <Reveal as="p" className="eyebrow eyebrow--amber">Browse by category</Reveal>
            <SplitTitle lines={["Eight aisles,", <em key="e">one yard.</em>]} />
          </div>
          <Link to="/shop" className="link-line">View all parts <ArrowRight size={14} /></Link>
        </div>
        <div className="cat-grid">
          {CATEGORIES.map((c, n) => (
            <Reveal key={c.key} delay={(n % 4) * 0.08}>
              <Link to={`/shop?category=${c.key}`} className="cat-tile">
                <Frame src={c.image} alt="" mask className="cat-tile__frame" />
                <span className="cat-tile__label">
                  <span className="num">{String(n + 1).padStart(2, "0")}</span>
                  <span className="cat-tile__name">{c.label}</span>
                  <span className="cat-tile__count">
                    {products ? `${counts[c.key] || 0} part${counts[c.key] === 1 ? "" : "s"}` : "…"} →
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section bg-ivory">
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal as="p" className="eyebrow eyebrow--amber">Most Wanted</Reveal>
              <SplitTitle lines={[<>The <em>Featured</em> Parts</>]} />
            </div>
            <div className="rail-nav">
              <button type="button" className="round-btn" onClick={() => scrollRail(-1)} aria-label="Previous parts"><ArrowLeft size={18} /></button>
              <button type="button" className="round-btn" onClick={() => scrollRail(1)} aria-label="Next parts"><ArrowRight size={18} /></button>
            </div>
          </div>
          <div className="rail" ref={rail}>
            {products === null
              ? Array.from({ length: 4 }, (_, n) => <CardSkeleton key={n} />)
              : featured.map((p, n) => <ProductCard key={p.id} product={p} index={n} />)}
          </div>
        </div>
      </section>

      <Marquee items={MARQUEE} />

      <section className="section container">
        <div className="section-head">
          <div>
            <Reveal as="p" className="eyebrow eyebrow--amber">Just arrived</Reveal>
            <SplitTitle lines={[<>New <em>Arrivals</em></>]} />
          </div>
          <Link to="/shop?sort=new" className="link-line">Shop new in <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid--4">
          {products === null
            ? Array.from({ length: 4 }, (_, n) => <CardSkeleton key={n} />)
            : newest.map((p, n) => <ProductCard key={p.id} product={p} index={n} />)}
        </div>
      </section>

      <section className="section section--tight container duo">
        <Reveal className="duo__card duo__card--image">
          <Frame src={sized(IMAGES.shop, 1200)} alt="" className="duo__bg" />
          <div className="duo__body">
            <p className="eyebrow eyebrow--light">📍 Cebu City</p>
            <h3>Visit the <em>shop</em></h3>
            <p>{SHOP.address}</p>
            <p>🕒 {hoursLine().split(" · ").slice(0, 2).join(" · ")}</p>
            <Link to="/visit" className="btn btn--light">See the map</Link>
          </div>
        </Reveal>
        <Reveal className="duo__card duo__card--plain" delay={0.1}>
          <Cog className="duo__ornament" size={120} strokeWidth={0.6} aria-hidden="true" />
          <div className="duo__body">
            <p className="eyebrow eyebrow--amber">Parts consultation</p>
            <h3>Talk to our <em>parts team</em></h3>
            <p>Send your vehicle's make, model and year — we'll check fitment and stock, usually within the hour.</p>
            <Link to="/chat" className="btn btn--solid">Start a conversation</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
