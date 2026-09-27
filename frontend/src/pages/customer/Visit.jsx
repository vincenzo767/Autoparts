import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapContainer, Marker, Polyline, TileLayer, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, LocateFixed } from "lucide-react";
import { SHOP } from "../../lib/format.js";
import { EASE, Reveal, Spinner } from "../../components/ui.jsx";

const SHOP_POS = [SHOP.lat, SHOP.lng];

const shopIcon = L.divIcon({
  className: "map-pin",
  html: '<span class="map-pin__pulse"></span><span class="map-pin__dot">R·A</span>',
  iconSize: [54, 54],
  iconAnchor: [27, 27],
});

const meIcon = L.divIcon({
  className: "map-me",
  html: '<span class="map-me__dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/** Great-circle distance in kilometres. */
export function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function FitRoute({ me }) {
  const map = useMap();
  useEffect(() => {
    if (me) map.flyToBounds(L.latLngBounds([me, SHOP_POS]), { padding: [70, 70], duration: 1.4 });
  }, [me, map]);
  return null;
}

export default function Visit() {
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const steel = useMemo(() => getComputedStyle(document.documentElement).getPropertyValue("--steel").trim() || "#1d2b36", []);

  useEffect(() => {
    document.title = "Visit us — Rovi Autoparts Surplus";
  }, []);

  const locate = () => {
    setError("");
    if (!("geolocation" in navigator)) {
      setError("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setError("We couldn't get your location. Check your browser permission.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const km = me ? haversineKm(me, SHOP_POS) : null;
  const distance = km === null ? null : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  const minutes = km !== null && km < 30 ? Math.round(Math.max(5, (km / 22) * 60)) : null;

  return (
    <div className="visit">
      <div className="visit__map-wrap">
        <MapContainer center={SHOP_POS} zoom={16} scrollWheelZoom={false} zoomControl={false} className="visit__map">
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
            maxZoom={19}
          />
          <ZoomControl position="bottomright" />
          <Marker position={SHOP_POS} icon={shopIcon} title={SHOP.name} alt={SHOP.name} />
          {me && (
            <>
              <Marker position={me} icon={meIcon} title="You are here" alt="You are here" />
              <Polyline positions={[me, SHOP_POS]} pathOptions={{ color: steel, weight: 2, dashArray: "6 8" }} />
            </>
          )}
          <FitRoute me={me} />
        </MapContainer>

        <motion.section
          className="visit__card"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
        >
          <p className="eyebrow eyebrow--amber">📍 Cebu City, Philippines</p>
          <h1 className="visit__title">
            Visit the <em>Shop</em>
          </h1>
          <p className="visit__text">
            See the part before you buy, bring your old part for matching, or talk fitment with our team. Walk-ins welcome.
          </p>
          <dl className="visit__facts">
            <div>
              <dt>Address</dt>
              <dd>{SHOP.address}</dd>
            </div>
            <div>
              <dt>🕒 Opening hours</dt>
              <dd>
                {SHOP.hours.map(([d, h]) => (
                  <span key={d} className="visit__hours">
                    <span>{d}</span>
                    <span>{h}</span>
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt>📞 Telephone</dt>
              <dd>
                {SHOP.phones.map((p, i) => (
                  <a key={p} href={`tel:${SHOP.phonesIntl[i]}`} className="visit__line">{p}</a>
                ))}
              </dd>
            </div>
            <div>
              <dt>✉ Email</dt>
              <dd><a href={`mailto:${SHOP.email}`}>{SHOP.email}</a></dd>
            </div>
            <div>
              <dt>Facebook</dt>
              <dd><a href={SHOP.facebook} target="_blank" rel="noopener">Rovi Autoparts Surplus on Facebook</a></dd>
            </div>
          </dl>
          <div className="visit__actions">
            <a href={SHOP.directions} target="_blank" rel="noopener" className="btn btn--solid">
              <Navigation size={15} /> Get directions
            </a>
            <button type="button" className="btn" onClick={locate} disabled={locating}>
              {locating ? <Spinner /> : <LocateFixed size={15} />} How far am I?
            </button>
          </div>
          <div aria-live="polite">
            {distance && (
              <p className="visit__distance">
                You're about <strong>{distance}</strong> away{minutes ? ` — roughly ${minutes} minutes by car.` : "."}
              </p>
            )}
            {error && <p className="visit__error">{error}</p>}
          </div>
          <Link to="/chat" state={{ draft: "Hello! I'd like to visit the shop to check a part." }} className="link-line">
            💬 Message us before you visit →
          </Link>
        </motion.section>
      </div>

      <section className="container section section--tight perks">
        {[
          ["01", "Bring your old part", "We'll match it against our stock side by side."],
          ["02", "Bench-tested before release", "Engines, alternators and starters are checked before they leave the shop."],
          ["03", "Loading assistance", "We'll help load heavy parts like engines and transmissions into your vehicle."],
        ].map(([n, t, d], i) => (
          <Reveal key={n} className="perk" delay={i * 0.1}>
            <span className="num">{n}</span>
            <h2 className="perk__title">{t}</h2>
            <p>{d}</p>
          </Reveal>
        ))}
      </section>
    </div>
  );
}
