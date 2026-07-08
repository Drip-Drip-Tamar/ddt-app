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
SANITY_TOKEN=<private token>
PUBLIC_TURNSTILE_SITE_KEY=<Cloudflare Turnstile site key>
TURNSTILE_SECRET_KEY=<private Cloudflare Turnstile secret key>
```

`SANITY_TOKEN` and `TURNSTILE_SECRET_KEY` must remain private. `SANITY_TOKEN` is used server-side for Sanity reads, contact form writes, visual-editing preview support, and Sanity backup exports. `TURNSTILE_SECRET_KEY` is used server-side to verify contact form submissions before storing them in Sanity.

Deploy previews use `previewDrafts` because Netlify sets `CONTEXT=deploy-preview`. Production uses the published perspective unless `SANITY_PREVIEW_DRAFTS=true` is explicitly set.

## Pull Request Checks

GitHub Actions runs on pull requests to `main`:

```sh
npm run check:prod
```

The production-parity check uses `.nvmrc`, installs website and Studio dependencies with `npm ci`, runs the website quality gate, and builds Sanity Studio. `sanity build` reaches Sanity's CDN for module metadata, so it needs network access.

The workflow expects the same Sanity secrets as Netlify:

```txt
SANITY_PROJECT_ID
SANITY_DATASET
SANITY_TOKEN
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

The Studio config uses `SANITY_STUDIO_PREVIEW_URL` to override the Presentation preview origin. If unset, local previews target `http://localhost:3000`.

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
