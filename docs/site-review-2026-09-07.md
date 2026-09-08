# Community website review — 7 September 2026

Branch: `feat/community-site-polish`, starting from `43ce19e` (verified against `origin/main`).

## Delivered

- Kept the existing community content, river photography, CMS sections, and teal palette. Improved page gutters, spacing, long-form readability, button contrast, image captions, and visible site identity.
- Added one main landmark, a keyboard skip link, current-page navigation, consistent page headings, 44px navigation targets, and reduced-motion support. Fixed menu focus transfer, Escape dismissal, and closing when keyboard focus leaves the menu.
- Fixed the Results canvas overflowing to 852px on narrow screens. Removed duplicate section padding. Displayed the most recent sample date, and made the data table accessible only when expanded, with keyboard scrolling available.
- Redirected the obsolete `/posts` listing to `/news`. Replaced the contact form's broken `/privacy` link with an anchor to its existing message-use explanation.
- Added shared skeletons with reserved chart/map dimensions, reduced-motion support, busy states, and clear failure messages. Each environmental chart renders as it approaches the viewport; independent feeds no longer wait for or fail with one another. Map code and location data load in parallel, monitoring requests time out after 30 seconds, and charts render without animation.
- Deferred Chart.js and Leaflet imports until the existing visibility observers need them. Kept error reporting, chart replacement, and detached-element guards.
- Replaced fixed 1920px CSS backgrounds with responsive image sources. Prioritised the leading hero and article image, deferred later backgrounds, provided smaller logo/avatar candidates, matched card sources to their grid widths, and matched article image sizes to the content column.
- Removed tracking parameters from canonical URLs, added a published-content sitemap and robots file, supplied description and social-image fallbacks, and added Article structured data from the existing CMS fields. Preview content remains unindexed.

## Verification

Node 22.18.0. Website build, lint (existing warnings only), typecheck, generated-type freshness, and Vitest coverage checks passed (369 tests across 41 files). All 20 Chromium browser checks passed. Browser checks use the built Netlify runtime on isolated port 4175 because another process owns 4173.

The browser suite covers Home, About, Your Voice, Results, Map, News, and Contact at 320px, 390px, and 1280px; navigation focus and dismissal; landmarks; horizontal overflow; headings; image loading; table disclosure; the old news redirect; chart/map rendering; delayed and failed requests; and consistent SEO metadata. External monitoring APIs are stubbed in these tests; published Sanity content is fetched live. Manual browser review also covered a published news article and its image caption.

The production build separates approximately 79.7 kB gzip of Chart.js and 42.9 kB gzip of Leaflet from the lightweight panel helpers. These are deferred payload sizes, not a measured production speed improvement. No field Core Web Vitals, Lighthouse score, native device, production deployment, or real contact submission is claimed.

## Content and maintenance follow-up

- The latest published sample observed during review was 3 February 2026. The new date label exposes this; the sampling team should confirm the publication schedule and keep the data current.
- Map explanatory copy refers to 2023 annual-return data and makes claims about data currency. Review this copy against the current providers before presenting it as up to date.
- Several community photos have empty CMS alt text. Add descriptions where the image conveys information beyond its adjacent heading and copy.
- A full privacy policy still needs owner-supplied content; the working contact link points to the existing explanation only.
- The request-scoped site-config cache deserves separate work that preserves preview isolation.
- The canonical origin uses an explicit `SITE_URL` or Netlify's production `URL`; without either, local builds use the request origin. Confirm the intended public domain before publication.

The implementation follows [Google's canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [image guidance](https://developers.google.com/search/docs/appearance/google-images), and [Article metadata guidance](https://developers.google.com/search/docs/appearance/structured-data/article). The contact-link contrast check uses the [WCAG normal-text threshold](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

No production CMS content, hosted deployment settings, or dependencies were changed. Changes are local to this branch.
