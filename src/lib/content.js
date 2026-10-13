// Loads and checks the editable content in content/*.json (edited by Ziba in Pages CMS).
// If something is wrong (an empty price, a deal price above the regular price), the build
// stops with a plain-English list and the live site stays as it was.
import rawServices from "../../content/services.json";
import rawGallery from "../../content/gallery.json";
import rawSettings from "../../content/settings.json";

export const CATEGORIES = { brows: "Brows", plus: "Brows and more", face: "Whole face", spot: "One spot" };
const WEEKS = { first: 1, second: 2, third: 3, fourth: 4, last: -1 };
const DAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
export const DEFAULT_CALENDAR = "https://zibadebeaute.com/booking-eyebrows/";
const NUM_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

// Photos uploaded through Pages CMS land in assets/uploads/. Astro optimizes them at build time.
const UPLOADS = import.meta.glob("/assets/uploads/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}", { eager: true, import: "default" });

const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
const isNum = (v, min) => typeof v === "number" && Number.isFinite(v) && v >= min;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function load() {
  const problems = [];
  const problem = (where, msg) => problems.push(`${where}: ${msg}`);

  // Services
  if (!Array.isArray(rawServices) || rawServices.length === 0) problem("Services", "there must be at least one service");
  const seen = new Set();
  const services = (Array.isArray(rawServices) ? rawServices : []).map((s, i) => {
    const where = `Service ${i + 1} (${s?.name || "no name"})`;
    const name = String(s?.name || "").trim();
    if (!name) problem(where, "needs a name");
    const price = num(s?.price), minutes = num(s?.minutes);
    if (!isNum(price, 0)) problem(where, "needs a price (a number, like 25)");
    if (!isNum(minutes, 1)) problem(where, "needs a time in minutes (a number, like 5)");
    if (!CATEGORIES[s?.category]) problem(where, `has an unknown group "${s?.category}"`);
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
      else deal = { price: dp, nth: WEEKS[dw], dow: DAYS[dd], label: `${dw} ${cap(dd)}`, when: `${cap(dw)} ${cap(dd)}` };
    }
    const cal = String(s?.calendar_link || "").trim();
    return { id, name, price, minutes, category: s?.category, group: CATEGORIES[s?.category], note: String(s?.note || "").trim(), deal, cal: /^https?:\/\//.test(cal) ? cal : "" };
  });

  // Settings
  const st = rawSettings || {};
  const hours = String(st.hours_text || "").trim() || "Monday to Saturday, by appointment only";
  const closedList = (Array.isArray(st.closed_days) ? st.closed_days : [st.closed_days]).filter(Boolean);
  const closedDays = closedList.map((d) => { if (!(d in DAYS)) problem("Settings", `unknown closed day "${d}"`); return DAYS[d]; }).filter((d) => d !== undefined);
  const link = (v) => { v = String(v || "").trim(); if (v && !/^https:\/\//.test(v)) problem("Settings", `online booking link must start with https:// (got "${v}")`); return /^https:\/\//.test(v) ? v : ""; };
  const online = { name: String(st.online_booking_name || "").trim(), url: link(st.online_booking_url), bySalon: { campus: link(st.online_booking_url_campus), thornebrook: link(st.online_booking_url_thornebrook) } };

  // Gallery
  const gallery = [];
  (Array.isArray(rawGallery) ? rawGallery : []).forEach((g, i) => {
    const where = `Gallery photo ${i + 1}`;
    const find = (p) => p ? UPLOADS["/" + String(p).replace(/^\/+/, "")] : undefined;
    if (!g?.photo) return problem(where, "needs a photo");
    const before = find(g.photo), after = g.after_photo ? find(g.after_photo) : null;
    if (!before) return problem(where, `photo not found (${g.photo}). Photos must be in assets/uploads.`);
    if (g.after_photo && !after) return problem(where, `after photo not found (${g.after_photo})`);
    gallery.push({
      before, after,
      service: String(g.service || "").trim(), caption: String(g.caption || "").trim(), alt: String(g.alt || "").trim(),
      ig: /^https:\/\/(www\.)?instagram\.com\//.test(g.instagram_url || "") ? g.instagram_url : ""
    });
  });

  if (problems.length) {
    throw new Error("\n\nThe site was NOT updated. Please fix:\n" + problems.map((p) => "  - " + p).join("\n") + "\n");
  }

  const prices = services.map((s) => s.price);
  const deals = services.filter((s) => s.deal);
  return {
    services, deals, gallery, hours, closedDays, online,
    priceRange: `$${Math.min(...prices)}–$${Math.max(...prices)}`,
    dealsIntro: `${NUM_WORDS[deals.length] || deals.length} ${deals.length === 1 ? "service costs" : "services cost"} less on one day each month.`,
    defaultCalendar: services.find((s) => s.cal)?.cal || DEFAULT_CALENDAR
  };
}

export const site = load();
