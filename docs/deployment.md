# Deployment

This project deploys the Astro website to Netlify and manages the Sanity Studio from the `studio/` workspace.

## Website Deployment

Netlify uses `netlify.toml`:

```toml
[build]
  publish = "dist"
  command = "npm ci && npm run build"
```

Netlify selects Node.js from `.nvmrc`, currently `22.18.0`. Do not keep a separate `NODE_VERSION` setting in Netlify unless it matches `.nvmrc`; remove any stale Node 20 override from the Netlify UI before deploying Astro 6.

The Astro config uses `output: 'server'` and `@astrojs/netlify`, so the deployed site is an SSR Netlify app rather than a fully static export.

## Required Netlify Environment

Set these variables in Netlify for production and deploy-preview contexts:

```txt
SANITY_PROJECT_ID=i1ywpsq5
SANITY_DATASET=production
SANITY_TOKEN=<least-privilege read token>
SANITY_WRITE_TOKEN=<least-privilege token restricted to contact document creation>
IP_HASH_SALT=<high-entropy random secret>
PUBLIC_TURNSTILE_SITE_KEY=<Cloudflare Turnstile site key>
TURNSTILE_SECRET_KEY=<private Cloudflare Turnstile secret key>
```

Keep all tokens and secrets private. `SANITY_TOKEN` is read-only and is used for authenticated draft reads, Presentation preview validation, and backup exports. `SANITY_WRITE_TOKEN` is used only by `/api/contact` and should be restricted to creating contact documents. `IP_HASH_SALT` is a high-entropy secret used to protect stored IP hashes. `TURNSTILE_SECRET_KEY` verifies contact submissions before storage.

If `SANITY_WRITE_TOKEN` or `IP_HASH_SALT` is missing, `/api/contact` fails closed with `503` and does not create a document. The write-capable `SANITY_TOKEN` previously exposed through rendered HTML must be revoked before merge or deployment; replace it with the two least-privilege tokens above.

Deploy previews render published content by default. Editors enter authenticated draft mode through Sanity Presentation: the Studio calls `/api/draft`, the route validates the preview URL secret with the read-only token, and Astro Sessions stores request-scoped preview state.

## Pull Request Checks

GitHub Actions runs on pull requests to `main`:

```sh
npm run check:prod
```

The production-parity check uses `.nvmrc`, installs website and Studio dependencies with `npm ci`, runs the website quality gate (including enforced coverage thresholds), and builds Sanity Studio. `sanity build` reaches Sanity's CDN for module metadata, so it needs network access.

The separate Playwright job runs `npm run test:e2e`. Playwright starts `netlify serve` on dedicated port `4173`, which builds and serves the Netlify production runtime. The suite stubs environmental API responses at the browser network boundary and does not submit a real contact message.

The workflow expects the same Sanity secrets as Netlify:

```txt
SANITY_PROJECT_ID
SANITY_DATASET
SANITY_TOKEN
SANITY_WRITE_TOKEN
IP_HASH_SALT
```

The Turnstile variables are required for deployed Netlify contexts that serve the contact form, but the PR check does not need to call Turnstile directly.

## Sanity Studio

The Studio lives in `studio/` and is configured for:

```txt
projectId: i1ywpsq5
dataset: production
studioHost: ddt-app
```

Run locally:

```sh
cd studio
npm run dev
```

Deploy Studio changes only when needed:

```sh
cd studio
npm run deploy
```

The Studio config uses `SANITY_STUDIO_PREVIEW_URL` to override the Presentation preview origin. If unset, local previews target `http://localhost:3000`. Presentation enters draft mode through `/api/draft` and Astro Sessions; a deploy preview is not draft-enabled merely because of its Netlify context.

## Pre-Deployment Checklist

1. Run `nvm install && nvm use`.
2. Run `npm run check:prod`.
3. Confirm no generated backup archives or secrets are staged.
4. If the change affects content shape, migrations, contact submissions, or Sanity data, run `npm run backup:sanity` first and upload the resulting `backups/sanity/<timestamp>/` folder to secure private storage.
5. Review Netlify environment variables before first deploy to a new site or context.
6. For Studio model changes, verify Studio locally before deploying it.

## Runtime External Data

Several API routes read public environmental data at request time and use cache headers:

- `/api/prf.json`: Environment Agency bathing-water pollution risk forecast
- `/api/rainfall.json`: Environment Agency flood-monitoring rainfall readings
- `/api/tamar-level.json`: Environment Agency flood-monitoring river and tide readings
- `/api/cso-live.json`, `/api/cso.json`, `/api/cso-map.json`: South West Water and Rivers Trust ArcGIS data

If one of these sources is unavailable, the route should degrade with the fallback behavior implemented in the corresponding API module.
