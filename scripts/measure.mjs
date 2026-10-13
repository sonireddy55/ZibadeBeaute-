// Measure the old and new sites with Google PageSpeed Insights and save the results
// to metrics/psi-latest.json. Recorded results live in metrics/psi.json.
//
// Usage (Node 18+):
//   NEW_URL=https://<your-deployed-url>/ node scripts/measure.mjs
// Optional: PSI_KEY=<Google API key> to avoid the anonymous rate limit.
//
// Run it 3 times and keep the median if you want numbers that hold up to scrutiny;
// PageSpeed results vary run to run.

import { writeFile, mkdir } from "node:fs/promises";

const OLD_URL = process.env.OLD_URL || "https://zibadebeaute.com/";
const NEW_URL = process.env.NEW_URL;
if (!NEW_URL) {
  console.error("Set NEW_URL to the deployed new site, e.g. NEW_URL=https://sonireddy55.github.io/zibadebeaute-/");
  process.exit(1);
}

const CATS = ["performance", "accessibility", "best-practices", "seo"];

async function run(url, strategy) {
  const q = new URLSearchParams({ url, strategy });
  CATS.forEach((c) => q.append("category", c));
  if (process.env.PSI_KEY) q.set("key", process.env.PSI_KEY);
  const res = await fetch("https://www.googleapis.com/pagespeedonline/v5/runPagespeed?" + q);
  if (!res.ok) throw new Error(`${url} (${strategy}): HTTP ${res.status} ${await res.text()}`);
  const j = await res.json();
  const lh = j.lighthouseResult;
  const a = lh.audits;
  const scores = Object.fromEntries(CATS.map((c) => [c, Math.round(lh.categories[c].score * 100)]));
  return {
    url, strategy, fetchTime: lh.fetchTime, scores,
    lcp_s: +(a["largest-contentful-paint"].numericValue / 1000).toFixed(2),
    fcp_s: +(a["first-contentful-paint"].numericValue / 1000).toFixed(2),
    tbt_ms: Math.round(a["total-blocking-time"].numericValue),
    cls: +a["cumulative-layout-shift"].numericValue.toFixed(3),
    weight_kb: Math.round(a["total-byte-weight"].numericValue / 1024),
    requests: a["network-requests"]?.details?.items?.length ?? null,
    a11y_failures: lh.categories.accessibility.auditRefs
      .filter((r) => a[r.id] && a[r.id].score === 0)
      .map((r) => r.id),
  };
}

const out = { measuredAt: new Date().toISOString(), old: {}, new: {} };
for (const strategy of ["mobile", "desktop"]) {
  out.old[strategy] = await run(OLD_URL, strategy);
  out.new[strategy] = await run(NEW_URL, strategy);
  console.log(strategy, "old", out.old[strategy].scores, "new", out.new[strategy].scores);
}
await mkdir("metrics", { recursive: true });
await writeFile("metrics/psi-latest.json", JSON.stringify(out, null, 2));
console.log("Saved metrics/psi-latest.json");
