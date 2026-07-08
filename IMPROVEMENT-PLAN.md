# Improvement Plan

Generated 2026-07-07 from a four-way architecture/robustness/testing/modernity scan.
This document is the working checklist. Tick tasks as they complete; add notes inline under each task as work progresses.

**Context**: Stack is already modern (Astro 6, Sanity 5, Tailwind 4, Vitest 4, React 19). Problems are structural, not version-related. The well-factored seam already exists — the `/api/*.json.ts` routes (testable, cached, centralised, ~1,760 LoC). But ~2,085 lines of chart/map/form logic sit above that seam in inline `<script>` blocks: duplicated, untestable, welded to DOM ids and `window` globals.

**Vocabulary**: *module* = anything with an interface and an implementation. *Seam* = where an interface lives; a place behaviour can be altered without editing in place. *Deep* module = lots of behaviour behind a small interface. *Locality* = change/bugs/knowledge concentrated in one place.

**Execution batches** (see end of document): security first, then chart extraction (flagship), then types/queries, then tests, then hygiene.

---

## Batch 1 — Security & correctness

### 0. [x] URGENT — stop leaking SANITY_TOKEN into production HTML — *done 2026-07-07; token prop was entirely unused; render now gated to preview contexts. USER ACTION: rotate SANITY_TOKEN to read-only, add SANITY_WRITE_TOKEN to Netlify + GitHub secrets.*

- **Files**: `src/layouts/Layout.astro:95`, `src/components/SanityVisualEditing.tsx`
- **Problem** (verified against Astro runtime internals): `Layout.astro:95` renders `<SanityVisualEditing client:only="react" token={import.meta.env.SANITY_TOKEN} />` unconditionally on every page in every environment. Astro serialises `client:only` props into the `astro-island` element's `props` attribute in the served HTML — the component's internal `import.meta.env.DEV && isInPresentation` check (SanityVisualEditing.tsx:53) runs after hydration and does not prevent serialisation. **The write-capable token is therefore visible via View Source on every production page.** (`grep dist/` finds nothing only because `output: 'server'` renders per-request — the leak is in served HTML, not build artifacts.)
- **Solution**: Never pass the token as a prop. Gate the component render itself to preview/dev contexts (`{isPreviewContext && <SanityVisualEditing ... />}`); the visual-editing client does not need the token prop at all (verify what it actually uses it for — likely removable outright). Then **rotate the exposed token in Sanity** — it must be assumed compromised.
- **Acceptance**: `curl` a production/preview page → HTML contains no token; visual editing still works in Presentation tool; old token revoked, new tokens issued per Task 3's split.

### 1. [x] Parameterise GROQ queries (injection fix) — *done 2026-07-07*

- **Files**: `src/data/page.js` (~L21 `getPageById`, ~L26 `getPageBySlug`), caller `src/pages/[...slug].astro:16`
- **Problem**: Slug from `Astro.params` is interpolated raw into the GROQ query string: `*[_type == "page" && slug.current == "${slug}"]`. A slug containing `"` breaks out of the string literal — query-breaking at minimum, injection at worst. Same pattern in `getPageById` with `_id == "${id}"`.
- **Reference implementation**: `src/pages/news/[slug].astro:59` and `:28` already use the correct parameterised pattern (`$slug` + params object).
- **Solution**: Convert both functions to parameterised queries (`client.fetch(query, { slug })`). Sweep the codebase for any other raw `${...}` interpolation inside GROQ strings.
- **Acceptance**: No template interpolation inside any GROQ query; existing pages still render; add a unit test that a slug containing `"` returns null/404 rather than throwing.

### 2. [x] Add security headers (CSP, HSTS, frame/referrer policies) — *done 2026-07-07; CSP uses 'unsafe-inline' pragmatically (Astro inline scripts); CDN allowances shrink after Task 6.*

- **Files**: `netlify.toml` (currently 6 lines, no `[[headers]]` block); alternatively `public/_headers`
- **Problem**: Zero security headers repo-wide — no CSP, no HSTS, no X-Frame-Options, no Referrer-Policy. SSR site with a public contact form.
- **Solution**: Add `[[headers]]` to `netlify.toml`. CSP must allow: Sanity (`*.sanity.io`, `cdn.sanity.io` images), Cloudflare Turnstile (`challenges.cloudflare.com`), chart/map CDNs currently used by `ChartLoader`/`LeafletLoader` (jsdelivr, unpkg, cdnjs — shrinks if Task 16 self-hosts these), Google Fonts (drops if Task 16 self-hosts fonts). Include `Strict-Transport-Security`, `X-Frame-Options: DENY` (or `frame-ancestors`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **Note**: Visual editing (Sanity Presentation iframe) needs `frame-ancestors` allowance for the Studio origin on preview contexts — verify before locking down.
- **Acceptance**: Headers visible on deploy preview; site functional (charts, map, Turnstile, Studio presentation preview all work); no CSP violations in console on main pages.

### 3. [x] Split Sanity tokens; remove module-load side effects from sanity-client — *done 2026-07-07; write client falls back to SANITY_TOKEN with a warning until SANITY_WRITE_TOKEN is set.*

- **Files**: `src/utils/sanity-client.ts` (token at L24, listener at L33-45), `astro.config.mjs` (spreads same config into `sanity()` integration), `src/pages/api/contact.ts:9-14`
- **Problem** (three parts):
  1. Single `SANITY_TOKEN` is write-capable (contact form calls `.create()` with it) yet is attached to the shared read client used for all rendering. One leak grants write access.
  2. `client.listen(...)` runs as a module-load side effect — opens a persistent websocket and `utimes`-touches `src/layouts/Layout.astro` to force rebuilds. Executes in any context that imports `client`, including the SSR server bundle; writes to the source tree at runtime.
  3. Two independently configured clients (shared client + bare `createClient` in `contact.ts`) duplicate `apiVersion '2024-01-31'` and drift.
- **Solution**: Introduce `SANITY_WRITE_TOKEN` (contact endpoint only) and make `SANITY_TOKEN` a read-only token (or drop token entirely for published-content reads + enable CDN). Extract a single client factory as the seam; gate the dev listener behind an explicit `import.meta.env.DEV` call site (invoked from dev-only code, not module scope). Align `apiVersion` in one constant.
- **Env changes**: Update `.env-sample`, Netlify env vars, and `.github/workflows/pr-checks.yml` secrets if names change.
- **Acceptance**: Contact form still creates documents; rendering works with read-only token; no websocket opened in production SSR; grep shows one `createClient` call site (plus studio).

### 4. [x] Shared upstream-fetch helper with timeouts — *done 2026-07-07; src/utils/upstream.ts, all 7 call sites converted.*

- **Files**: all of `src/pages/api/*.json.ts` (`prf`, `cso`, `cso-live`, `cso-map`, `rainfall`, `tamar-level`), Turnstile fetch in `src/pages/api/contact.ts`
- **Problem**: Zero `AbortController`/`AbortSignal`/timeout usage across every upstream call (Environment Agency, SWW, Turnstile). A hung upstream hangs the serverless function until the platform kills it.
- **Solution**: One deep module — `fetchUpstream(url, opts)` in e.g. `src/utils/upstream.ts` — hiding `AbortSignal.timeout(~8s)`, ok-check, JSON parse, and a consistent error envelope. Convert all 7 call sites. Keep the existing per-endpoint cache-header behaviour (it is already good: `s-maxage` + `stale-while-revalidate` on success, `no-cache` on error).
- **Acceptance**: All API route tests still pass (they mock `global.fetch` — should be transparent); new unit tests for the helper (timeout, non-ok, malformed JSON).

### 5. [x] Harden contact endpoint — *done 2026-07-07; length caps + salted IP hash (IP_HASH_SALT env). USER ACTION: set IP_HASH_SALT in Netlify env.*

- **Files**: `src/pages/api/contact.ts`
- **Problem**: No length limits on `name`/`email`/`subject`/`message` — arbitrary-size payloads written straight into Sanity via `.create()`. IP hash is unsalted SHA-256 (rainbow-tableable over IPv4 space). Rate limiting exists only as a Netlify edge function (`netlify/edge-functions/contact-rate-limit.ts`, 5 req/60s) — nothing applies in local dev or non-Netlify hosting.
- **What is already good** (keep): honeypot `_website` field with fake-success response; min-fill-time gate (3s); Turnstile verification with action + hostname check, fail-closed on missing secret; spam reasons recorded on document.
- **Solution**: Length caps (e.g. name 200, email 320, subject 300, message 5,000) with 400 on breach; salt the IP hash (env-provided salt); optionally a minimal in-handler rate check as defence-in-depth.
- **Acceptance**: Existing 11 contact tests pass (extend for length limits); oversize payload → 400.

---

## Batch 2 — Chart extraction (flagship)

### 6. [ ] Extract chart client logic into importable modules

- **Files**: `src/components/TamarEnvironmentalMonitoring.astro` (861 lines, ~589 inline script — 68%), `TamarStormOverflow.astro` (360/207), `TamarStormOverflowMap.astro` (408/222), `WaterQualityChart.astro` (395/180), `PollutionRiskForecast.astro` (231/108), `ChartLoader.astro` (127 script lines), `LeafletLoader.astro` (165)
- **Problem**: Each component is one giant un-exported inline function with the same envelope: `fetch → response.ok check → .json() → build Chart config → render → catch`, copy-pasted 6×. Error handling copy-pasted (`document.getElementById('<name>-error').classList.remove('hidden')`). Chart option objects re-declared per component (TEM alone: `scales` ×4, `tooltip` ×4, `annotation` ×4; WaterQualityChart `scales` ×8). Chart.js reached via `window.loadChart()` global — no seam to mock. Locations hardcoded as string literals in client JS (Calstock ×3, Gunnislake ×3, Plymouth ×3 in TEM), bypassing the `locationConfig` seam the API routes use correctly. Nothing importable ⇒ nothing testable.
- **Solution**:
  - New directory `src/scripts/charts/` (TypeScript, exported functions). One module per panel: fetch + transform + Chart-config build as pure/exported functions.
  - One deep envelope module: `mountPanel({ endpoint, buildConfig, canvasId, errorId })` — owns fetch/guard/render/error-banner once for all panels.
  - Shared chart-theme factory: colours, scales, tooltip defaults, safe-range annotation builder.
  - Convert `ChartLoader`/`LeafletLoader` from `window.loadChart()`/`window.loadLeaflet()` globals to ES module exports. **Keep their internals** — they are deep modules (3-CDN sequential fallback jsdelivr→unpkg→cdnjs, promise caching, annotation-plugin chaining, Leaflet icon patching); they pass the deletion test. Only the interface changes (consider bundling chart.js/leaflet from npm instead of CDN as part of this — decide during implementation; CSP in Task 2 shrinks accordingly).
  - `.astro` files shrink to markup + a one-line `<script>` that imports and mounts.
  - Panel config (station ids, labels, thresholds) passed as props/data-attributes fed from `locationConfig`, not string literals in client JS.
- **Benefits**: Interface becomes the test surface — every panel unit-testable in Vitest with mocked fetch. Leverage: 6 components share one envelope. Locality: chart styling, error UX, retry policy each change in one file.
- **Acceptance**: All panels render identically (visual check on `/`, `/map`, `/results`); no `window.loadChart` references remain; each panel's transform + config-build covered by unit tests (see Task 12).

### 7. [ ] Deduplicate TEM; delete orphaned chart components

- **Files**: `TamarEnvironmentalMonitoring.astro`, `TamarRiverLevel.astro` (425 lines), `TamarRainfall.astro` (314 lines)
- **Problem**: TEM re-implements the standalone panels inline instead of composing them — fetches the same three endpoints (`/api/tamar-level.json`, `/api/rainfall.json`, `/api/cso-live.json`) and renders 4 `new Chart()` instances with copy-pasted config. Meanwhile `TamarRiverLevel` and `TamarRainfall` are referenced by **zero** pages, Sanity mappings, or Stackbit models (verified by grep across `src`, `studio`, `.stackbit`). Deletion test fails in the worst way: deleting the standalones removes nothing because TEM holds independent copies.
- **Solution**: After Task 6, TEM becomes a composition of the shared panel modules. Delete `TamarRiverLevel.astro` and `TamarRainfall.astro` (their behaviour lives on in the shared modules; resurrect as thin wrappers later if Sanity block mapping ever needs them standalone).
- **Benefit**: One copy of each panel's logic; ~700 lines deleted.
- **Acceptance**: `/results` TEM section renders all four panels; grep shows no references to deleted files.

### 8. [ ] Fix chart lifecycle for client-side navigation

- **Files**: all chart components — `DOMContentLoaded` listeners (e.g. TEM L824) vs `Header.astro:163` which correctly uses `astro:after-swap`
- **Problem**: Charts register on `DOMContentLoaded` only; after an Astro view-transition/client-side navigation, charts never re-initialise. Latent bug, inconsistent lifecycle model across the codebase.
- **Solution**: Standardise on `astro:page-load` inside the Task 6 `mountPanel` envelope (fires on initial load and after every swap). Ensure idempotent mounting (destroy/recreate or guard against double-init).
- **Acceptance**: Navigate between pages via links (no full reload) — charts render on arrival at `/map` and `/results`.

### 9. [ ] Extract contact form client logic

- **Files**: `src/pages/contact.astro` (~L227-257 inline: Turnstile init, submit handler, `fetch('/api/contact')`, success `innerHTML`)
- **Problem**: Same anti-pattern as the charts — form logic welded to the DOM, untestable. (The server half, `src/pages/api/contact.ts`, is fine and well-tested.)
- **Solution**: Extract to `src/scripts/contact-form.ts` with exported handler functions; inline script becomes import + mount. Lower priority than charts — self-contained and small.
- **Acceptance**: Form submits, Turnstile works, success/error states show; submit handler logic unit-testable.

---

## Batch 3 — Types & queries

### 10. [ ] Adopt Sanity TypeGen; convert data layer to TypeScript

- **Files**: `src/data/blocks.js`, `page.js`, `siteConfig.js`, `waterQuality.js`, `locationConfig.js` (all untyped JS, implicit `any` returns); `src/pages/news.astro:11`, `news/[slug].astro:15,28`, `posts/index.astro:10` (fetches typed as bare `SanityDocument`)
- **Problem**: No `sanity typegen` anywhere (no `sanity.cli.ts` extract, no `sanity.types.ts`). Every Sanity document shape is effectively `any` at every call site — `post.seoTitle`, `post.featuredImage` unchecked. The `groq` package is used only as a highlighting tag. Hand-written `Page` type imported from bare `types` module in `[...slug].astro`.
- **Solution**: `sanity schema extract` + `sanity typegen generate` wired into scripts (and a CI check that generated types are fresh); convert all five `src/data/*.js` → `.ts` with typed returns; replace hand-written types with generated ones where they overlap.
- **Depends on**: Task 13 (strict tsconfig) makes this land better — do together or 13 first.
- **Acceptance**: `npm run typecheck` passes; data modules export typed functions; at least the news/post pages consume generated types.

### 11. [ ] Consolidate post queries; replace hand-rolled portable-text renderer

- **Files**: `news.astro`, `news/[slug].astro`, `posts/index.astro`, `src/utils/portable-text.ts`
- **Problem**: Three different "post" projections across three pages, none shared: `featuredImage {...}` block copy-pasted between `news.astro` and `news/[slug].astro`; author projected as string (`author->name`) in one and full object in another; `posts/index.astro` uses a third minimal shape. `portableTextToHtml` is a hand-rolled renderer handling only `strong/em/underline/code` marks and `h1-h4/blockquote/p` — **no links, no lists, no images**: content containing a link silently drops the mark.
- **Solution**: One `src/data/posts.ts` module owning `POSTS_QUERY`/`POST_QUERY` with shared projection fragments (same pattern `blocks.js` already uses for `IMAGE`/`SECTIONS`). Replace the renderer with `@portabletext/to-html` (or `astro-portabletext` component) configured for the site's block types; keep `extractTextFromPortableText` (used for excerpts, fully tested).
- **Acceptance**: News list + detail render identically for current content; a post containing a link and a bullet list renders both (add fixture test); one definition of the post projection.

### 12. [ ] Unify data-layer error handling

- **Files**: `src/data/page.js` + `siteConfig.js` (no try/catch — a Sanity blip 500s the whole page) vs `waterQuality.js` + `locationConfig.js` (try/catch, safe fallbacks; locationConfig additionally has 5-min in-memory cache + `DEFAULT_CONFIG` + warn-on-missing)
- **Problem**: Four modules, three error philosophies. `page.js`/`siteConfig.js` run in `[...slug].astro` and `Layout.astro` — an unhandled fetch failure is a build/SSR 500.
- **Solution**: Adopt the `locationConfig` pattern (cache + fallback + warn) as the standard. Decide deliberately per module: which failures should hard-fail the build (arguably a missing page at build time SHOULD fail loudly) vs degrade gracefully at runtime (siteConfig → cached/default nav rather than 500). Document the decision in the module.
- **Cleanup**: Remove confirmed-dead exports while in here: `getPageById` (`page.js`), `getWaterSamplesInRange` + `SAMPLES_RANGE_QUERY` (`waterQuality.js`), `getSamplingSites` + `SITES_QUERY` (external consumers: none), `clearConfigCache` (`locationConfig.js`) — verify each with grep before deleting.
- **Acceptance**: Simulated Sanity failure (mock) on siteConfig does not 500 the layout; dead exports gone; tests updated.

---

## Batch 4 — Tests (after Batch 2)

### 13. [ ] Delete tautological tests; keep the good ones

- **Files**: `tests/integration/page-rendering.test.ts` (entire file, ~13 tests), `tests/integration/news-rendering.test.ts` (SEO-fallback L166-241 and date-formatting L243-308 sections)
- **Problem**: `page-rendering.test.ts` mocks `src/data/page` and `src/data/siteConfig` with hardcoded objects then asserts those same objects back — zero production code executes; its "component section mapping" block asserts on an inline copy of the map, not the real renderer. `news-rendering.test.ts` re-implements `seoTitle || title` fallback inline and tests `toLocaleDateString` — testing the Node stdlib, not the app. False coverage confidence.
- **What is genuinely good** (keep, use as the model): the 7 `api-*` route tests (import real handlers, mock only boundaries), unit tests for `waterQuality`, `locationConfig`, `columns`, `news-image-sizing`, `portable-text`, `sanity-*`, `blocks`, `page-data`, `site-config`, `sanity-backup`, `check-node-version`, and `contact-rate-limit` (imports the real edge function).
- **Solution**: Delete `page-rendering.test.ts`; strip the tautological sections of `news-rendering.test.ts` (its `extractTextFromPortableText` import duplicates unit coverage — fold anything unique into the unit file). Replace with real tests where Batch 2/3 created importable surfaces.
- **Acceptance**: `npm run test` green; no test asserts a mock against itself.

### 14. [ ] Unit tests for extracted chart modules

- **Depends on**: Task 6.
- **Problem being fixed**: ~2,085 lines of client JS currently have zero coverage (TEM 588, RiverLevel 278, StormOverflowMap 221, StormOverflow 206, Rainfall 203, WaterQualityChart 178, LeafletLoader 164, ChartLoader 126, PRF 107, Header 14). `water-quality.test.ts:477-480` even documents logic that was moved client-side and out of test reach.
- **Solution**: For each `src/scripts/charts/*` module: test transform functions (API JSON fixture → chart datasets), config builders (thresholds, annotations, colours), and `mountPanel` error paths (non-ok response → error banner) with jsdom (already a dependency, currently unused — enable per-file via `// @vitest-environment jsdom` or a browser-mode project).
- **Acceptance**: Every exported function in `src/scripts/charts/` has coverage; coverage of the new directory ≥ 80%.

### 15. [ ] Playwright smoke suite + CI hardening

- **Files**: new `e2e/` + `playwright.config.ts`; `.github/workflows/pr-checks.yml`; `vitest.config.ts`
- **Problem**: No e2e at all (`.playwright-mcp/` is an MCP artifact dir, not a suite). CI runs only on PRs to `main` — direct pushes and upstream API drift are never caught. Coverage configured but no thresholds enforced, so the untested surface never fails a build. Global test setup silences `console` entirely and sets `global.fetch = vi.fn()` with no default (un-mocked fetches fail confusingly).
- **Solution**:
  - Playwright with a thin smoke: home renders, `/map` shows map + CSO panel, `/results` shows charts, `/news` lists posts, contact form happy path (Turnstile test key). Run against `astro preview` build in CI.
  - Add `push: branches: [main]` trigger to the workflow.
  - Add coverage thresholds to `vitest.config.ts` (start at current levels, ratchet up).
  - Consider a scheduled weekly run to catch EA/SWW API drift.
- **Acceptance**: e2e green locally + CI; a push to main triggers the workflow; coverage regression fails CI.

---

## Batch 5 — Modernity & hygiene

### 16. [ ] Fonts + per-page loader mounting + visual-editing token audit

- **Files**: `src/layouts/Layout.astro:64-66` (fonts), `:90-91` (loaders), `:95` (SanityVisualEditing)
- **Problem**: Render-blocking Google Fonts stylesheet pulling the full Mulish 400-900 italic+roman axis. `ChartLoader` + `LeafletLoader` mounted on every page's `<body>` regardless of whether the page has a chart/map. (Token audit resolved — confirmed leak, escalated to Task 0.)
- **Solution**: Self-host fonts (`@fontsource-variable/mulish` or Astro 6 fonts API), subset weights actually used. Move loaders to the pages/components that need them (naturally falls out of Task 6 if modules import their own loader).
- **Acceptance**: No `fonts.googleapis.com` request; Lighthouse render-blocking warning gone; chart-less pages load no Chart.js.

### 17. [ ] Audit `output: 'server'` → static-first routing

- **Files**: `astro.config.mjs:11`
- **Problem**: Whole site is SSR-by-default. Only `api/contact.ts` sets `prerender` explicitly; every content page pays SSR latency and Netlify function invocations per request.
- **Constraint (verified)**: full static is NOT viable — visual editing depends on per-request SSR of Sanity-backed pages. `sanity-client.ts:7-27` pins `perspective`/`stega` per-deployment from env (`NODE_ENV`, Netlify `CONTEXT`, preview flags), and the live-edit UX reloads the page expecting fresh draft content (`Layout.astro:97-99`); prerendered pages would serve stale HTML until rebuild. Also: `news/[slug].astro:14` has a `getStaticPaths()` that is dead code under `output:'server'` — remove or repurpose.
- **Solution (revised)**: Keep server output. Instead: add `prerender = true` to any page NOT backed by editable Sanity content (candidate: `404.astro`); add explicit `prerender = false` to the six JSON API routes for clarity; remove the dead `getStaticPaths`; add sensible `Cache-Control`/CDN caching on SSR content pages so production requests are edge-cached even though rendering is dynamic. Document why the site is SSR in `astro.config.mjs` comment.
- **Acceptance**: Content pages carry cache headers; dead `getStaticPaths` gone; visual editing unaffected.

### 18. [ ] Strict TypeScript + JSX transform

- **Files**: `tsconfig.json` (L2 extends `astro/tsconfigs/base`; L11 `"jsx": "react"`)
- **Problem**: Loosest Astro preset — no `strict`, no `strictNullChecks` (studio half has `strict: true`; the two halves disagree). `"jsx": "react"` is the classic transform, outdated for React 19.
- **Solution**: Extend `astro/tsconfigs/strict`; change jsx to `"react-jsx"`; fix resulting errors (expect a tail of null-check fixes — timebox; `@ts-expect-error` with TODO where non-trivial, burn down in follow-up).
- **Sequencing**: Before or with Task 10 (typegen lands much better under strict).
- **Acceptance**: `npm run typecheck` green under strict.

### 19. [ ] Retire Stackbit visual editing — **DECIDED 2026-07-07: retire**

- **Files**: `stackbit.config.ts`, `.stackbit/models/` (15 files), `@stackbit/cms-sanity` + `@stackbit/types` deps, `data-sb-field-path` attributes (`Header.astro:15,38,49,56,76,85`, `Layout.astro:92,94`, others), legacy `stackbitObjectsChanged` reload listener (`Layout.astro:95-100`)
- **Problem**: Two overlapping visual-editing systems. Sanity Presentation tool (configured in `studio/sanity.config.ts`) is the newer, native path — session history shows it was added later. Stackbit doubles the dependency/config surface and sprinkles dead markup through production HTML.
- **Decision required**: Is Netlify Visual Editor still used by any content editor? If yes, keep and skip this task. If no →
- **Solution**: Delete `stackbit.config.ts`, `.stackbit/`, both `@stackbit/*` deps, all `data-sb-field-path` attributes, the legacy reload listener, and Stackbit references in docs (`CLAUDE.md`, `README.md`, `AI-REFERENCE.md`).
- **Acceptance**: Presentation tool still works end-to-end (edit → preview updates); no `stackbit`/`data-sb` references outside git history.

### 20. [ ] Repo hygiene sweep

- **Files/dirs**:
  - `sanity-export/` — 46 tracked files ~1.1 MB incl. `export.tar.gz` (440 KB binary) and a May-2024 content dump with 31 committed images. Point-in-time content in source control.
  - `sessions/api/__pycache__/*.pyc` — 28 committed compiled-Python files.
  - `DripDrip_Bacterial_Sampling_18_06_2025.csv` — 27 KB raw data at repo root.
  - Legacy CJS scripts `sanity-export/*.js` (`require()` in a `"type": "module"` package, ESLint-ignored) whose only purpose is served better by `scripts/sanity-backup.mjs`.
  - Dependencies `fs-extra` + `configstore` — used ONLY by those legacy scripts.
- **Solution**: Gitignore + `git rm -r --cached` the pycache; remove the stale export dump (content lives in Sanity + `backups/` flow per `docs/backups.md`); move or delete the CSV (if it seeded Sanity data, note that in docs and delete); retire legacy scripts and drop `fs-extra`/`configstore`; update `package.json` scripts (`create-project`, `import`, `import-content`) accordingly.
- **Caution**: Confirm nothing still imports the export scripts before deleting; keep `scripts/sanity-backup.mjs` path intact (`npm run export` aliases it).
- **Acceptance**: `git ls-files | grep -E 'pyc|sanity-export'` empty; `npm ls fs-extra configstore` shows nothing at root; all remaining npm scripts run.

### 21. [ ] Retest Rollup WASM override

- **Files**: `package.json` `overrides: { "rollup": "npm:@rollup/wasm-node" }`
- **Problem**: Workaround for the old npm optional-deps bug (`Cannot find module @rollup/rollup-linux-x64-gnu` on CI). Forces pure-WASM Rollup — slower builds everywhere. Underlying npm bug largely resolved.
- **Solution**: Remove override, regenerate lockfile, verify local + CI + Netlify builds. If Netlify still hits the bug, restore and document why with a link.
- **Acceptance**: Green build on all three environments without the override, or override restored with an explanatory comment/doc.

### 22. [ ] Small config alignments

- **ESLint**: root `eslint .` never lints `studio/` (it has its own config — either wire a root script `lint:studio` into `test:all`, or leave and document). `sanity-export/**` ignore disappears with Task 20.
- **Prettier**: root `.prettierrc` (printWidth 160, tabWidth 4, semi) vs `studio/package.json` prettier (printWidth 100, no semi) — pick one style, apply to both halves.
- **Renovate**: `renovate.json` is a 3-line stub extending `local>netlify-templates/renovate-config` — verify the preset still resolves; add lockfile maintenance + sensible grouping.
- **Studio deps (verified — both removable)**: `@sanity/presentation` has zero direct imports (`studio/sanity.config.ts:4` imports from bundled `sanity/presentation`); `"media": "^0.2.1"` has zero imports anywhere in studio source — mistaken install alongside `sanity-plugin-media` (which IS used, config line 53). Remove both.
- **npm workspaces** (optional, larger): root + studio are separate installs with two lockfiles; workspaces would deduplicate React/TS/ESLint. Only do if CI/Netlify story stays simple.
- **Acceptance**: lint/format run clean across both halves; studio builds after dep removals.

### 23. [ ] Accessibility touch-ups

- **Files**: `Header.astro` (mobile nav)
- **Problem**: Mobile nav panel has no focus trap and no Escape-to-close; otherwise decent (aria-label/expanded/controls present, `lang="en"` set).
- **Solution**: Escape closes panel + returns focus to toggle; trap focus while open. Keep the existing `astro:after-swap` re-init.
- **Acceptance**: Keyboard-only walkthrough of mobile nav works.

---

## Execution order & dependencies

| Batch | Tasks | Parallelisable? | Notes |
|-------|-------|-----------------|-------|
| 1 Security | **0**, 1, 2, 3, 4, 5 | Yes — independent | 0 first (live leak + token rotation); 0 and 3 touch the same token setup — same agent |
| 2 Charts | 6 → 7 → 8, 9 | 6 first, then 7/8 sequenced; 9 anytime | Flagship; biggest payoff |
| 3 Types | 18 → 10 → 11, 12 | 18 before 10; 11/12 parallel | 18 lives in Batch 5 list but sequences here |
| 4 Tests | 13, 14, 15 | 13 anytime; 14 after 6; 15 last | |
| 5 Hygiene | 16, 17, 19*, 20, 21, 22, 23 | Yes — independent | *19 blocked on user decision (Stackbit) |

**Verification after each batch**: `npm run test:all` (lint + typecheck + build + tests) must be green before starting the next batch. Final review in the main thread after all batches.

## Open decisions

1. ~~Task 19 (Stackbit)~~ — decided 2026-07-07: retire Stackbit; Sanity Presentation is the sole visual-editing path.
2. ~~Task 6 loaders~~ — decided 2026-07-07: bundle chart.js/leaflet from npm (chart.js already a dependency; Vite code-splits per page; CSP shrinks; delete the CDN-fallback loaders).
3. ~~Task 17 static flip~~ — resolved: visual editing requires SSR content pages; task revised to cache-headers + selective prerender.

## Resolved by verification (2026-07-07)

- `SANITY_TOKEN` **is** serialised into production HTML via `client:only` props → new Task 0, token must be rotated.
- Full `output: 'static'` not viable (visual editing needs per-request SSR); Task 17 rewritten.
- Studio deps `media` and `@sanity/presentation` confirmed unused → fold into Task 22.
- `TamarRiverLevel.astro` / `TamarRainfall.astro` confirmed orphaned (zero refs in `src`, `studio`, `.stackbit`).
