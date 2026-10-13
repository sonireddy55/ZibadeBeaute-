# Ziba de Beauté — website redesign

A redesign of [zibadebeaute.com](https://zibadebeaute.com) for Ziba Ahmadi's eyebrow threading salons in Gainesville, FL. Built by Propolis Freelancing.

- `index.html`: the new site (one page: services and prices, deal days, about Ziba, press, reviews, locations)
- `case-study.html`: before-and-after comparison for the client and for recruiters
- `styles.css`, `main.js`: no framework, no build step
- `scripts/measure.mjs`: runs Google PageSpeed Insights on the old and new sites and writes `metrics/psi.json`, which `case-study.html` displays

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)

Repo Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.

## Measure

After the site is deployed:

```sh
NEW_URL=https://sonireddy55.github.io/zibadebeaute-/ node scripts/measure.mjs
git add metrics/psi.json && git commit -m "Add PageSpeed results" && git push
```

## Open items before launch

- **Photos are hotlinked** from the current WordPress site (`zibadebeaute.com/wp-content/...`). If the old site is shut down, they will break. Save them into `assets/` and update the `src` paths.
- **Booking still runs on the old WordPress booking pages.** Each Book button links to the existing page for that service. If the old site is replaced at the same domain, booking needs a new home (for example Square or Vagaro) before launch.
- **Hours:** the site says "Monday to Saturday, by appointment only," as the old site does. Google Maps lists both salons as open daily. Confirm with Ziba which is right.
- `canonical` and `og:url` point to `https://zibadebeaute.com/`. Keep them only if this site replaces the old one at that domain.
