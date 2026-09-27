# Rovi Autoparts Surplus — Surplus auto parts shop system

A public landing site, a customer shopping app (browse → favourite → bag → reserve → pick up), real-time chat between customers and the shop, and an owner's admin console for Rovi Autoparts Surplus, Panganiban Street, Cebu City.

| Folder | What it is |
|---|---|
| `frontend/landing/` | The static landing site (plain HTML, CSS and JS): home, Our Story, Yard Book, Privacy Policy and Terms. Served at `/`. |
| `frontend/src/` | The React app (Vite, React 18, Framer Motion): the customer shop and the admin console. Served at `/app/`. |
| `backend/` | The Spring Boot 3.4 API (Java 21): accounts, catalogue, bag, reservations, chat over WebSocket, photo uploads. Served at `/api` and `/ws`. |

## Run it (development)

Requirements: **Java 21+**, **Maven 3.9+** and **Node 18+**.

Configuration comes first (see below). Then use two terminals:

```bash
# Terminal 1: the API on http://localhost:8080 (creates ./data and ./uploads)
cd backend && mvn spring-boot:run

# Terminal 2: the web app on http://localhost:5173
cd frontend && npm install && npm run dev
```

Open http://localhost:5173. The Vite dev server serves the landing site at `/` and the app at `/app/`, and proxies `/api` and `/ws` to the API on port 8080.

## Configuration first

```bash
cp backend/.env.example backend/.env
```

Fill in at least `ADMIN_EMAIL` and `ADMIN_PASSWORD`. With no database settings, the API uses an embedded H2 database in `backend/data/`, so nothing else needs to be installed.

## Accounts created on first start

- **The owner:** created from `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME`, only when no admin exists yet. Sign in, then change the password in **Admin → Profile → Security**.
- **A demo customer (optional):** created when `DEMO_CUSTOMER_EMAIL` and `DEMO_CUSTOMER_PASSWORD` are set.
- **Everyone else** creates their own account on the sign-in page. Self-registration only ever creates customers.

An empty database is seeded with a **24-part starter catalogue** across all eight categories. Its fitment, prices and stock are sample data: replace them with real stock, or set `SEED_DEMO_DATA=false` to start with an empty catalogue.

## What's inside

**Customers**
- Home with rotating featured parts, eight category aisles, featured rail and new arrivals
- Shop with category tabs, search (name, brand, vehicle fitment, part number), sort and in-stock filter, all kept in the URL
- Part pages with photo zoom, spec sheet (brand, fits, part no., condition, origin), option picker (side, tire size), stock meter and related parts
- Favourites (saved parts) and a bag with stock checks
- Reserve for pickup: no online payment; stock is held straight away and released automatically if not collected in time
- Reservations with a status timeline, hold countdown and online cancellation
- Visit page with a real OpenStreetMap map, directions and a "How far am I?" distance estimate
- Real-time chat with the shop, including "Ask about fitment for this part"
- Profile with photo, vehicle notes, password change and "sign out of all devices"

**Owner / admin**
- Dashboard: KPIs, units by category chart, low-stock quick restock and recent reservations
- Parts: grid or table view, publish/hide, feature, delete (with "Hide instead")
- Part editor: drag-and-drop photo upload with progress, reorder (first is the cover), https links and a live customer preview
- Inventory with inline stock editing
- Reservations: Confirm → Ready → Collected (with payment method and reference), cancel, extend a hold by 7 days; each step messages the customer
- Customers: suspend or reactivate, message
- Live messages inbox with unread counts in the sidebar and top bar

## Security

- Sessions are HS256 JWTs in an **HttpOnly, SameSite=Strict** cookie (`RA_SESSION`), renewed while active. Logging out, changing a password or suspending an account revokes every session immediately.
- **CSRF** double-submit protection (`XSRF-TOKEN` cookie + `X-XSRF-TOKEN` header).
- Passwords hashed with **BCrypt** (cost 12) and a strength rule of 8–72 characters with upper and lower case letters, a number and a symbol.
- **Brute-force defence:** 5 failed sign-ins lock the account for 15 minutes; per-IP limits of 30 sign-ins per 15 minutes and 10 registrations per hour; unknown emails get the same generic error in the same time.
- **Headers:** strict Content-Security-Policy (no inline scripts in the app), `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy and COOP.
- **Uploads** are checked by their content (magic bytes), not their name: only JPG, PNG, WEBP or GIF up to 5 MB. SVG and renamed files are rejected. Files are given random names and served without path traversal.
- WebSocket clients may only subscribe to their own queue and can never publish.
- Photos are stored in `UPLOAD_DIR`, or in a public-read **Supabase Storage** bucket when `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set. Existing local uploads are moved to Supabase automatically on the next start.
- Error responses never include stack traces.

## Configuration (environment variables)

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `8080` | |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | – | Empty means embedded H2 in `backend/data/` |
| `DB_POOL_SIZE` | `5` | |
| `SUPABASE_URL` / `SUPABASE_SECRET_KEY` | – | Both set means photos go to Supabase Storage |
| `SUPABASE_BUCKET` | `parts` | Created automatically, public-read |
| `UPLOAD_DIR` | `./uploads` | |
| `JWT_SECRET` | random each start | **Set in production** (32+ characters): `openssl rand -base64 64` |
| `JWT_TTL_MINUTES` | `120` | |
| `COOKIE_SECURE` | `false` | `true` behind HTTPS |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated, e.g. `http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | – / – / `Roel Batawang` | Owner account, created only when no admin exists |
| `SEED_DEMO_DATA` | `true` | Seeds the starter catalogue into an empty database |
| `DEMO_CUSTOMER_EMAIL` / `DEMO_CUSTOMER_PASSWORD` | – | Optional demo customer |
| `VITE_WS_URL` (frontend build env) | – | e.g. `wss://rovi-autoparts-api.onrender.com/ws`, only for split hosting |

Real environment variables always take precedence over `backend/.env`. The optional `mysql` Spring profile (`SPRING_PROFILES_ACTIVE=mysql`) switches the default database URL to a local MySQL.

## Production build (one jar serves everything)

```bash
cd frontend && npm run build:jar
cd ../backend && mvn -DskipTests package
java -jar target/roviautoparts-api-1.0.0.jar
```

The jar serves the landing site at `/`, the app at `/app/` (deep links included) and the API at `/api`, all from one origin. Set `JWT_SECRET`, `COOKIE_SECURE=true` (behind HTTPS) and your database settings first.

## Deploy (Render + Vercel + Supabase)

1. **Supabase:** create a project. Copy the **Session pooler** connection string into JDBC form (`jdbc:postgresql://<pooler-host>:5432/postgres?sslmode=require`, username `postgres.<project-ref>`), and copy the project URL and a secret key for Storage. The `parts` bucket is created automatically.
2. **Render (API):** create a Blueprint from this repository. `render.yaml` builds `backend/Dockerfile` (Singapore region, free plan), generates `JWT_SECRET` and sets `COOKIE_SECURE=true`. In the dashboard, fill in `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and set `CORS_ALLOWED_ORIGINS` to your Vercel domain.
3. **Vercel (web):** import the repository with **`frontend`** as the root directory. `vercel.json` runs `npm run build:vercel`, serves the landing site at `/` and the app at `/app/`, proxies `/api/*` to `https://rovi-autoparts-api.onrender.com`, and sets the security headers. Add the environment variable `VITE_WS_URL=wss://rovi-autoparts-api.onrender.com/ws` so live chat connects directly to the API with a short-lived ticket. If your Render service has a different name, update the URL in `vercel.json` and `VITE_WS_URL`.

CI (`.github/workflows/ci.yml`) runs `mvn verify` for the backend and `npm run build` for the frontend on every push to `main` and on every pull request.
