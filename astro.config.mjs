// @ts-check
import { defineConfig } from "astro/config";

// Cloudflare Pages serves the site from the root ("/"). GitHub Pages serves it from
// /ZibadeBeaute-/, so its workflow sets BASE_PATH. Page links are relative, so both work.
export default defineConfig({
  site: process.env.SITE_URL || "https://zibadebeaute.pages.dev",
  base: process.env.BASE_PATH || "/",
  build: { format: "file" },   // index.html, book.html, gallery.html
  trailingSlash: "ignore",
  compressHTML: false
});
