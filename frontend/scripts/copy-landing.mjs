// Copies the static landing site (landing/*.html and landing/assets) into dist/ for Vercel.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "landing");
const out = path.join(root, "dist");

fs.mkdirSync(out, { recursive: true });
for (const name of fs.readdirSync(src)) {
  if (name.endsWith(".html")) fs.copyFileSync(path.join(src, name), path.join(out, name));
}
fs.cpSync(path.join(src, "assets"), path.join(out, "assets"), { recursive: true });
console.log("Copied the landing site into dist/");
