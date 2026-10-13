# Ziba de Beauté: salon website redesign

**Live site:** https://sonireddy55.github.io/ZibadeBeaute-/
**Case study:** https://sonireddy55.github.io/ZibadeBeaute-/case-study.html

A redesign of [zibadebeaute.com](https://zibadebeaute.com) for Ziba Ahmadi, a Guinness World Record eyebrow threader with two salons in Gainesville, FL. Client work by Propolis Freelancing.

![New site, desktop](docs/desktop.png)

## Results

Measured with Google PageSpeed Insights (Lighthouse 13.5.0) on both sites, minutes apart, on October 13, 2026.

| | Old, mobile | New, mobile | Old, desktop | New, desktop |
|---|---:|---:|---:|---:|
| Performance | 44 | **99** | 79 | **100** |
| Accessibility | 78 | **100** | 90 | **100** |
| Best practices | 96 | **100** | 96 | **100** |
| SEO | 85 | **100** | 92 | **100** |
| Largest contentful paint | 10.7 s | **1.2 s** | 1.9 s | **0.3 s** |
| Page weight | 2,852 KiB | **89 KiB** | 2,708 KiB | **342 KiB** |

PageSpeed varies run to run. An earlier run scored the old site 56 on mobile performance; [all runs are recorded](metrics/psi.json) with links to the full reports.

Other measured changes on the home page:

- Scripts: 57 → 1. Stylesheets: 45 → 1.
- Photos with descriptive alt text: 0 of 4 → 5 of 5.
- Structured data for Google: none for the business → a `BeautySalon` entry for each location.
- Visible typos: 4 → 0. Leftover template content ("Hello world!" post and others): 4 items → 0.

The [case study](https://sonireddy55.github.io/ZibadeBeaute-/case-study.html) has the full before-and-after list.

## What I built

- **One page instead of five.** All 14 services with prices and times, a "What do you need today?" filter, both locations, press, reviews and contact info. Each service links straight to its booking page.
- **A booking page.** Each Book button opens `book.html` with that service selected. Clients pick a salon, a day and time of day, and their name. The page writes the text to Ziba (prefilled `sms:` link, plus a copy button for desktop) and links to her current calendar. It catches Sundays and applies deal-day prices.
- **Deal days that show real dates.** The old site said "first Monday of each month". The new one works out the next date in the salon's time zone and highlights the deal on the day.
- **Accurate content.** Fixed the search description, which listed three services she doesn't offer. The text-only number now opens a text message instead of a call. Both locations are listed. Each press mention links to the article.
- **Mobile first.** A sticky booking button appears once you scroll past the hero. Every button is at least 44 px tall, and nothing scrolls sideways at widths from 320 px up.

<p>
  <img src="docs/mobile.png" width="260" alt="New site on a phone: hero">
  <img src="docs/mobile-services.png" width="260" alt="New site on a phone: services with the filter">
</p>

## Technical decisions

- **No framework, no build step.** Plain HTML, CSS and vanilla JavaScript (no dependencies), hosted on GitHub Pages. The page works with JavaScript off; scripts only add the filter, the deal dates and the review ticker.
- **Self-hosted fonts with metric-matched fallbacks.** Removing the Google Fonts request chain took mobile performance from 91 to 99. The fallback fonts are sized from the real fonts' measurements (computed with fontTools), so the headline does not move when the fonts load: layout shift went from 0.061 to 0.
- **Images.** Converted to WebP and resized to their largest display size: 544 KB → 249 KB. Each has its width and height set, so nothing shifts while it loads.
- **Lazy third parties.** The YouTube documentary loads only when someone presses play.
- **Accessibility.** Skip link, visible focus, `aria-pressed` filter buttons, screen-reader labels on every Book link, and reduced-motion support for the thread animation and the review ticker.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

To re-measure: `NEW_URL=https://sonireddy55.github.io/ZibadeBeaute-/ node scripts/measure.mjs` (writes `metrics/psi-latest.json`).

## Before launch at zibadebeaute.com

- **Online booking:** when Ziba has a new booking system (Square Appointments is planned), paste its link into `ONLINE_BOOKING` at the top of `book.js`. Until then, "See open times" uses her current WordPress calendar.
- **Hours:** the site says "Monday to Saturday, by appointment only", as the old site does, but Google Maps lists both salons as open daily. To confirm with Ziba.
- `canonical` and `og:url` point to `https://zibadebeaute.com/`, which is correct only once this site replaces the old one.
