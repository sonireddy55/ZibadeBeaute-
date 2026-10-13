// Builds the site into _site/ from src/*.html, content/*.json and the static files.
// .github/workflows/build.yml runs it on every push and publishes _site to GitHub Pages,
// so edits made in Pages CMS go live automatically.
// Run locally with: npm install && npm run build, then serve _site/.
//
// If the content has a problem (a missing price, an unknown category), the build stops
// with a plain-English message and the live site stays as it was.

import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const r = (...p) => path.join(ROOT, ...p);
const OUT = r("_site");
const o = (...p) => path.join(OUT, ...p);
// Files and folders copied into the site as they are.
const STATIC = ["styles.css", "main.js", "book.js", "gallery.js", "case-study.html", "assets/fonts", "assets/icon.svg",
  "assets/ziba-portrait.webp", "assets/record-certificate.webp", "assets/record-recognition.webp", "assets/record-event.webp",
  "assets/record-crowd.webp", "metrics", "docs", ".nojekyll"];

const CATEGORIES = { brows: "Brows", plus: "Brows and more", face: "Whole face", spot: "One spot" };
const WEEKS = { first: 1, second: 2, third: 3, fourth: 4, last: -1 };
const DAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const DEFAULT_CALENDAR = "https://zibadebeaute.com/booking-eyebrows/";

const problems = [];
const problem = (where, msg) => problems.push(`${where}: ${msg}`);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
const isNum = (v, min) => typeof v === "number" && Number.isFinite(v) && v >= min;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

async function json(file) {
  try { return JSON.parse(await readFile(r(file), "utf8")); }
  catch (e) { problem(file, `could not be read (${e.message})`); return null; }
}

// ---------- Services ----------
function loadServices(raw) {
  if (!Array.isArray(raw)) { problem("content/services.json", "must be a list of services"); return []; }
  const seen = new Set();
  return raw.map((s, i) => {
    const where = `Service ${i + 1} (${s?.name || "no name"})`;
    const name = String(s?.name || "").trim();
    if (!name) problem(where, "needs a name");
    const price = num(s?.price), minutes = num(s?.minutes);
    if (!isNum(price, 0)) problem(where, "needs a price (a number, like 25)");
    if (!isNum(minutes, 1)) problem(where, "needs a time in minutes (a number, like 5)");
    if (!CATEGORIES[s?.category]) problem(where, `has an unknown category "${s?.category}"`);
    let id = slug(name) || `service-${i + 1}`;
    while (seen.has(id)) id += "-2";
    seen.add(id);

    let deal = null;
    const dw = s?.deal_week || "none", dd = s?.deal_day || "", dp = num(s?.deal_price);
    if (dw !== "none") {
      if (!(dw in WEEKS)) problem(where, `has an unknown deal week "${dw}"`);
      else if (!(dd in DAYS)) problem(where, "has a deal week but no deal day");
      else if (!isNum(dp, 0)) problem(where, "has a deal day but no deal price");
      else if (isNum(price, 0) && dp >= price) problem(where, `deal price ($${dp}) must be lower than the regular price ($${price})`);
      else deal = { price: dp, nth: WEEKS[dw], dow: DAYS[dd], label: `${dw} ${cap(dd)}` };
    }
    const cal = String(s?.calendar_link || "").trim();
    return { id, name, price, minutes, category: s?.category, note: String(s?.note || "").trim(), deal, cal: /^https?:\/\//.test(cal) ? cal : "" };
  });
}

function renderServiceItem(s) {
  const deal = s.deal
    ? `\n        <p class="deal" data-nth="${s.deal.nth}" data-dow="${s.deal.dow}">$${s.deal.price} on the ${esc(s.deal.label)} of every month.</p>`
    : "";
  const note = s.note ? `<p class="item-note">${esc(s.note)}</p>` : "";
  return `      <li class="item" data-group="${s.category}">
        <div class="item-main"><h3>${esc(s.name)}</h3>${note}</div>
        <p class="item-meta"><span class="price">$${s.price}</span><span class="mins">${s.minutes} min</span></p>
        <a class="book" href="book.html?service=${s.id}">Book<span class="vh"> ${esc(s.name.toLowerCase())}</span></a>${deal}
      </li>`;
}

function renderDealItem(s) {
  const when = `${cap(s.deal.label.split(" ")[0])} ${s.deal.label.split(" ")[1]}`;
  return `      <li><strong>${esc(s.name)}, $${s.deal.price}</strong><span>${esc(when)}</span><span class="next" data-nth="${s.deal.nth}" data-dow="${s.deal.dow}"></span></li>`;
}

const NUM_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

// ---------- Settings ----------
function loadSettings(raw) {
  const s = raw || {};
  const hours = String(s.hours_text || "").trim() || "Monday to Saturday, by appointment only";
  const closed = (Array.isArray(s.closed_days) ? s.closed_days : [s.closed_days]).filter(Boolean).map((d) => {
    if (!(d in DAYS)) problem("Settings", `unknown closed day "${d}"`);
    return DAYS[d];
  }).filter((d) => d !== undefined);
  const url = (v) => { v = String(v || "").trim(); if (v && !/^https:\/\//.test(v)) problem("Settings", `online booking link must start with https:// (got "${v}")`); return /^https:\/\//.test(v) ? v : ""; };
  return {
    hours, closed,
    online: { name: String(s.online_booking_name || "").trim(), url: url(s.online_booking_url), bySalon: { campus: url(s.online_booking_url_campus), thornebrook: url(s.online_booking_url_thornebrook) } }
  };
}

// ---------- Gallery ----------
let sharp = null;
async function getSharp() {
  if (sharp !== null) return sharp;
  try { sharp = (await import("sharp")).default; } catch { sharp = false; }
  return sharp;
}

function resolveUpload(p) {
  if (!p) return null;
  const clean = String(p).replace(/^\/+/, "").replace(/^ZibadeBeaute-\//, "");
  return r(clean);
}

async function processImage(src, key, width, matchTo) {
  const sh = await getSharp();
  const buf = await readFile(src);
  const hash = createHash("sha1").update(buf).update(String(width)).update(JSON.stringify(matchTo || null)).digest("hex").slice(0, 10);
  const out = `assets/gallery/${key}-${hash}.webp`;
  if (!sh) {
    // No image tool available: copy the upload as-is (slower, but never broken).
    const rel = path.relative(ROOT, src).split(path.sep).join("/");
    await mkdir(path.dirname(o(rel)), { recursive: true });
    await cp(src, o(rel));
    return { file: rel, w: matchTo?.w || 1200, h: matchTo?.h || 1200 };
  }
  let img = sh(buf).rotate();
  if (matchTo) img = img.resize(matchTo.w, matchTo.h, { fit: "cover", position: "attention" });
  else img = img.resize({ width, withoutEnlargement: true });
  await mkdir(o("assets/gallery"), { recursive: true });
  await img.clone().webp({ quality: 82 }).toFile(o(out));
  const meta = await sh(await readFile(o(out))).metadata();
  return { file: out, w: meta.width, h: meta.height };
}

async function loadGallery(raw) {
  if (!Array.isArray(raw)) { problem("content/gallery.json", "must be a list of photos"); return []; }
  const items = [];
  for (const [i, g] of raw.entries()) {
    const where = `Gallery photo ${i + 1}`;
    const photo = resolveUpload(g?.photo), after = resolveUpload(g?.after_photo);
    if (!photo) { problem(where, "needs a photo"); continue; }
    if (!existsSync(photo)) { problem(where, `photo not found (${g.photo})`); continue; }
    if (after && !existsSync(after)) { problem(where, `after photo not found (${g.after_photo})`); continue; }
    const key = `g${i + 1}`;
    const a = await processImage(photo, key + "a", 900);
    const b = after ? await processImage(after, key + "b", 900, { w: a.w, h: a.h }) : null;
    items.push({ before: a, after: b, caption: String(g?.caption || "").trim(), service: String(g?.service || "").trim(), alt: String(g?.alt || "").trim(), ig: /^https:\/\/(www\.)?instagram\.com\//.test(g?.instagram_url || "") ? g.instagram_url : "" });
  }
  return items;
}

function renderGalleryItem(g, i) {
  const label = g.alt || g.caption || g.service || `Eyebrow threading by Ziba, photo ${i + 1}`;
  const cap = (g.service || g.caption || g.ig)
    ? `<figcaption>${g.service ? `<strong>${esc(g.service)}</strong>` : ""}${g.caption ? esc(g.caption) : ""}${g.ig ? ` <a href="${esc(g.ig)}">See on Instagram</a>` : ""}</figcaption>`
    : "";
  const img = (x, cls, alt) => `<img class="${cls}" src="${x.file}" width="${x.w}" height="${x.h}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  if (g.after) {
    return `        <li><figure class="ba">
          <div class="ba-frame">
            ${img(g.before, "ba-before", "Before: " + label)}
            ${img(g.after, "ba-after", "After: " + label)}
            <span class="ba-tag ba-tag-before" aria-hidden="true">Before</span><span class="ba-tag ba-tag-after" aria-hidden="true">After</span>
            <input class="ba-range" type="range" min="0" max="100" value="50" aria-label="Compare before and after. Move left to show more of the after photo.">
            <span class="ba-handle" aria-hidden="true"></span>
          </div>
          ${cap}
        </figure></li>`;
  }
  return `        <li><figure><div class="shot">${img(g.before, "", label)}</div>${cap}</figure></li>`;
}

// ---------- Build ----------
async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const [rawServices, rawGallery, rawSettings] = await Promise.all([json("content/services.json"), json("content/gallery.json"), json("content/settings.json")]);
  const services = loadServices(rawServices || []);
  const settings = loadSettings(rawSettings);
  const gallery = await loadGallery(rawGallery || []);
  if (!services.length) problem("content/services.json", "has no services");

  if (problems.length) {
    console.error("\nThe site was NOT updated. Please fix:\n" + problems.map((p) => "  - " + p).join("\n") + "\n");
    process.exit(1);
  }

  const prices = services.map((s) => s.price);
  const deals = services.filter((s) => s.deal);
  const priceRange = `$${Math.min(...prices)}–$${Math.max(...prices)}`;
  const hasGallery = gallery.length > 0;

  // index.html
  let index = await readFile(r("src/index.html"), "utf8");
  index = index
    .replace("{{SERVICES}}", services.map(renderServiceItem).join("\n"))
    .replaceAll("{{PRICE_RANGE}}", priceRange)
    .replaceAll("{{HOURS}}", esc(settings.hours))
    .replace("{{NAV_GALLERY}}", hasGallery ? '      <li><a href="gallery.html">Gallery</a></li>\n' : "")
    .replace("{{GALLERY_TEASER}}", hasGallery ? `<!-- GALLERY TEASER -->
<section class="teaser" aria-labelledby="teaser-title">
  <div class="wrap">
    <h2 id="teaser-title">Ziba's work</h2>
    <ul class="gallery-grid">
${gallery.slice(0, 3).map(renderGalleryItem).join("\n")}
    </ul>
    <a class="teaser-link" href="gallery.html">See the full gallery</a>
  </div>
</section>
<script src="gallery.js" defer></script>` : "");
  if (deals.length) {
    index = index
      .replace("{{DEALS}}", deals.map(renderDealItem).join("\n"))
      .replace("{{DEALS_INTRO}}", `${NUM_WORDS[deals.length] || deals.length} ${deals.length === 1 ? "service costs" : "services cost"} less on one day each month.`)
      .replace("<!--DEALS_START-->\n", "").replace("\n<!--DEALS_END-->", "");
  } else {
    index = index.replace(/<!--DEALS_START-->[\s\S]*?<!--DEALS_END-->/, "");
  }

  // book.html
  const bookData = {
    services: services.map((s) => ({ id: s.id, name: s.name, price: s.price, mins: s.minutes, group: CATEGORIES[s.category], note: s.note, cal: s.cal, deal: s.deal })),
    online: settings.online, closedDays: settings.closed, defaultCalendar: services.find((s) => s.cal)?.cal || DEFAULT_CALENDAR
  };
  // Service options are rendered here (not by book.js) so the page doesn't shift on load.
  const groupsOrder = Object.keys(CATEGORIES).filter((c) => services.some((s) => s.category === c));
  const serviceOptions = groupsOrder.map((c) => `          <div class="opt-group">
            <p class="opt-group-title">${esc(CATEGORIES[c])}</p>
${services.filter((s) => s.category === c).map((s) => `            <label class="opt opt-service">
              <input type="radio" name="service" value="${s.id}">
              <span class="opt-body"><span class="opt-title">${esc(s.name)}</span>${s.note ? `<span class="opt-sub">${esc(s.note)}</span>` : ""}${s.deal ? `<span class="opt-deal">$${s.deal.price} on the ${esc(s.deal.label)} of every month</span>` : ""}</span>
              <span class="opt-meta"><span class="opt-price">$${s.price}</span><span class="opt-mins">${s.minutes} min</span></span>
            </label>`).join("\n")}
          </div>`).join("\n");
  let book = await readFile(r("src/book.html"), "utf8");
  book = book.replace("{{SERVICE_OPTIONS}}", serviceOptions);
  book = book.replace("{{BOOK_DATA}}", JSON.stringify(bookData).replace(/</g, "\\u003c")).replaceAll("{{HOURS}}", esc(settings.hours));

  // gallery.html
  let gal = await readFile(r("src/gallery.html"), "utf8");
  gal = gal
    .replace("{{GALLERY_ROBOTS}}", hasGallery ? "" : '<meta name="robots" content="noindex">')
    .replace("{{GALLERY_GRID}}", hasGallery
      ? `      <ul class="gallery-grid">\n${gallery.map(renderGalleryItem).join("\n")}\n      </ul>`
      : `      <div class="gallery-empty"><p>New photos are on the way. Until then, see Ziba's latest work on Instagram.</p></div>`);

  const banner = "<!-- Generated by scripts/build.mjs from src/ and content/ (edited in Pages CMS). -->\n";
  for (const [name, html] of [["index.html", index], ["book.html", book], ["gallery.html", gal]]) {
    const leftover = html.match(/\{\{[A-Z_]+\}\}/);
    if (leftover) { console.error(`Build error: ${name} still contains ${leftover[0]}`); process.exit(1); }
    await writeFile(o(name), html.replace("<!doctype html>", "<!doctype html>\n" + banner));
  }
  for (const f of STATIC) {
    if (!existsSync(r(f))) { console.error(`Build error: missing ${f}`); process.exit(1); }
    await cp(r(f), o(f), { recursive: true });
  }

  console.log(`Built: ${services.length} services, ${deals.length} deal days, ${gallery.length} gallery photos${(await getSharp()) ? "" : " (images not optimized: sharp not installed)"}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
