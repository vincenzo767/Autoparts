// Shared formatting helpers and the single source of truth for the business profile.

export const SHOP = {
  name: "Rovi Autoparts Surplus",
  shortName: "Rovi",
  legalName: "Rovi Autoparts Surplus",
  founder: "Roel Tangpos Batawang",
  founded: 1998,
  address: "Panganiban Street, Cebu City, Cebu 6000, Philippines",
  addressShort: "Panganiban St, Cebu City",
  phones: ["0906 848 5956", "0999 470 7109"], // display format
  phonesIntl: ["+639068485956", "+639994707109"], // tel: links
  email: "vinceran2003@gmail.com",
  facebook: "https://www.facebook.com/share/19Jt1C5djN/",
  lat: 10.2955, // CONFIRM: drop the pin on the actual storefront
  lng: 123.899, // CONFIRM
  directions: "https://www.google.com/maps/dir/?api=1&destination=Panganiban+Street,+Cebu+City,+Cebu+6000",
  hours: [
    ["Monday – Saturday", "8:00 – 17:30"], // CONFIRM
    ["Sunday", "Closed"], // CONFIRM
  ],
};

export const hoursLine = () => SHOP.hours.map(([d, h]) => `${d} · ${h}`).join(" · ");

const unsplash = (id, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Swaps the w= parameter of a CDN image URL (no-op for other URLs). */
export function sized(url, w) {
  if (!url || !/[?&]w=\d+/.test(url)) return url;
  return url.replace(/([?&])w=\d+/, `$1w=${w}`);
}

export const IMAGES = {
  hero: unsplash("1527383418406-f85a3b146499", 1800),
  engines: unsplash("1486262715619-67b85e0b08d3", 1600),
  tires: unsplash("1578844251758-2f71da64c96f", 1600),
  yard: unsplash("1719242513425-f5eed99b282f", 1600),
  shop: unsplash("1781177289398-a8641fdf12ff", 1400),
};

export const CATEGORIES = [
  { key: "ENGINES", label: "Engines", image: unsplash("1486262715619-67b85e0b08d3") },
  { key: "TRANSMISSIONS", label: "Transmissions", image: unsplash("1711199694531-e982a79ea381") },
  { key: "TIRES_WHEELS", label: "Tires & Wheels", image: unsplash("1578844251758-2f71da64c96f") },
  { key: "BEARINGS", label: "Bearings & Hubs", image: unsplash("1643933871541-090062935680") },
  { key: "SUSPENSION", label: "Suspension & Steering", image: unsplash("1785338215401-51c15e4037b8") },
  { key: "BRAKES", label: "Brakes", image: unsplash("1696494561430-de087dd0bd69") },
  { key: "ELECTRICAL", label: "Electrical", image: unsplash("1749223673543-3c9c9100c172") },
  { key: "BODY_PARTS", label: "Body & Lights", image: unsplash("1549207107-2704df6b92ab") },
];

export const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label || key || "";

export const ORIGINS = [
  { key: "JAPAN", label: "Japan surplus" },
  { key: "SOUTH_KOREA", label: "South Korea surplus" },
  { key: "LOCAL", label: "Local salvage" },
  { key: "OTHER", label: "Other" },
];

export const originLabel = (key) => ORIGINS.find((o) => o.key === key)?.label || "";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

export const formatPrice = (n) => peso.format(Number(n || 0));

/** ₱1.2M / ₱145k / ₱950 */
export function compactPeso(n) {
  const v = Number(n || 0);
  const abs = Math.abs(v);
  const trim = (x) => x.toFixed(1).replace(/\.0$/, "");
  if (abs >= 1_000_000) return `₱${trim(v / 1_000_000)}M`;
  if (abs >= 1_000) return `₱${trim(v / 1_000)}k`;
  return formatPrice(v);
}

export const LOW_STOCK = 3;

export function stockInfo(stock) {
  const n = Number(stock || 0);
  if (n <= 0) return { level: "out", label: "Sold out", hint: null };
  if (n <= LOW_STOCK) return { level: "low", label: `Only ${n} left`, hint: "Selling quickly" };
  return { level: "in", label: `In stock · ${n} available`, hint: null };
}

const dateFmt = new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Manila" });
const dateTimeFmt = new Intl.DateTimeFormat("en-PH", {
  day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila",
});
const timeFmt = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });

/** Formats an ISO instant, or a plain yyyy-MM-dd date. */
export function formatDate(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m - 1, d));
  }
  return dateFmt.format(new Date(value));
}

export const formatDateTime = (value) => (value ? dateTimeFmt.format(new Date(value)) : "");

export const formatTime = (value) => (value ? timeFmt.format(new Date(value)) : "");

export function relativeTime(value) {
  if (!value) return "";
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(value);
}

const manilaDay = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(d);

export function dayLabel(value) {
  const d = new Date(value);
  const today = manilaDay(new Date());
  const yesterday = manilaDay(new Date(Date.now() - 86400000));
  const key = manilaDay(d);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return new Intl.DateTimeFormat("en-PH", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Manila" }).format(d);
}

export const firstName = (name) => (name || "").trim().split(/\s+/)[0] || "";

export function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "R";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(new Date()));
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export const ORDER_STATUS = {
  PENDING: { label: "Awaiting confirmation", short: "Pending", tone: "amber" },
  CONFIRMED: { label: "Confirmed", short: "Confirmed", tone: "steel" },
  READY_FOR_PICKUP: { label: "Ready for pickup", short: "Ready", tone: "steel" },
  COMPLETED: { label: "Completed", short: "Completed", tone: "ink" },
  CANCELLED: { label: "Cancelled", short: "Cancelled", tone: "rust" },
};

export const ORDER_FLOW = ["PENDING", "CONFIRMED", "READY_FOR_PICKUP", "COMPLETED"];

export const PAYMENT_METHODS = [
  { key: "CASH", label: "Cash" },
  { key: "GCASH", label: "GCash" },
  { key: "MAYA", label: "Maya" },
  { key: "CARD", label: "Card" },
  { key: "BANK_TRANSFER", label: "Bank transfer" },
];

export const paymentLabel = (key) => PAYMENT_METHODS.find((p) => p.key === key)?.label || "";

/** "3 days", "5 hours", "less than an hour", or null once passed. */
export function timeLeft(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = ms / 3600000;
  if (hours >= 48) return `${Math.floor(hours / 24)} days`;
  if (hours >= 24) return "1 day";
  if (hours >= 2) return `${Math.floor(hours)} hours`;
  if (hours >= 1) return "1 hour";
  return "less than an hour";
}

/** Tomorrow in Manila as yyyy-MM-dd. */
export const tomorrowISO = () => manilaDay(new Date(Date.now() + 86400000));

export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
