import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const landingRoot = path.join(here, "landing");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

/** Serves the static landing site at the root in dev and preview; the app lives under /app/. */
function landingSite() {
  const handler = (req, res, next) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    let rel = null;
    if (url === "/") rel = "index.html";
    else if (/^\/[a-z0-9-]+\.html$/i.test(url)) rel = url.slice(1);
    else if (url.startsWith("/assets/")) rel = url.slice(1);
    if (!rel) return next();

    const file = path.resolve(landingRoot, rel);
    // Path containment: never serve anything outside landing/.
    if (!file.startsWith(landingRoot + path.sep)) return next();
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) return next();
      res.setHeader("Content-Type", TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
      fs.createReadStream(file).pipe(res);
    });
  };
  return {
    name: "rovi-landing-site",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  base: "/app/",
  plugins: [react(), landingSite()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: "http://localhost:8080", changeOrigin: false },
      "/ws": { target: "http://localhost:8080", ws: true, changeOrigin: false },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: "http://localhost:8080", changeOrigin: false },
      "/ws": { target: "http://localhost:8080", ws: true, changeOrigin: false },
    },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 900,
  },
});
