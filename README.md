# Drip Drip Tamar Website

This repository contains the public Drip Drip Tamar website and its Sanity Studio content model.

The site is an Astro SSR application deployed to Netlify. Sanity is the production content store for pages, posts, site configuration, media, water-quality samples, sampling sites, and contact form submissions.

## Stack

- Astro with the Netlify adapter
- Sanity Content Lake and Sanity Studio
- React components for Sanity visual editing
- Tailwind CSS and DaisyUI
- Vitest, Astro Check, TypeScript, and ESLint

The production Sanity project is `i1ywpsq5` and the default dataset is `production`.

## Setup

Use the Node.js version declared in `.nvmrc`:

```sh
nvm install
nvm use
```

Install the website dependencies:

```sh
npm install
```

Install the Studio dependencies:

```sh
cd studio
npm install
```

Create `.env` in the repo root:

```sh
cp .env-sample .env
```

Set these values:

```txt
SANITY_PROJECT_ID="i1ywpsq5"
SANITY_DATASET="production"
SANITY_TOKEN="<least-privilege read token>"
SANITY_WRITE_TOKEN="<least-privilege token restricted to contact document creation>"
IP_HASH_SALT="<high-entropy random secret>"
PUBLIC_TURNSTILE_SITE_KEY="..."
TURNSTILE_SECRET_KEY="..."
```

Keep all tokens and secrets private. `SANITY_TOKEN` is read-only and is used for authenticated draft reads, Presentation preview validation, and backup exports. `SANITY_WRITE_TOKEN` is used only by `/api/contact` and should be restricted to creating contact documents. `IP_HASH_SALT` is a high-entropy secret used to protect stored IP hashes. If either `SANITY_WRITE_TOKEN` or `IP_HASH_SALT` is missing, `/api/contact` returns `503`.

The write-capable `SANITY_TOKEN` that was previously exposed through rendered HTML must be revoked before this branch is merged or deployed. Replace it with separate least-privilege read and contact-write tokens.

## Local Development

Run the Astro site from the repo root:

```sh
npm run dev
```

The site runs on `http://localhost:3000`.

Run Sanity Studio in a second terminal:

```sh
cd studio
npm run dev
```

The Studio runs on `http://localhost:3333`.

For Presentation tool previews, set `SANITY_STUDIO_PREVIEW_URL` when the preview origin is not `http://localhost:3000`. Presentation enables authenticated draft reads through `/api/draft`, which validates the preview request and stores preview state in Astro Sessions.

## Content And Data

Sanity stores:

- pages and posts
- site configuration
- media assets
- sampling sites and water samples
- contact form submissions

The site also reads live or recent environmental data from public external APIs:

- Environment Agency flood-monitoring and bathing-water APIs
- South West Water storm-overflow ArcGIS services
- Rivers Trust EDM 2023 ArcGIS data for map context

Generated Sanity exports contain private contact-message data. Do not commit or upload them to public storage.

## Backups

Create a local, gitignored Sanity backup with:

```sh
npm run backup:sanity
```

The archive, checksum, and manifest are staged under `backups/sanity/<timestamp>/`. Upload the whole timestamped folder to secure private storage after export.

See [docs/backups.md](docs/backups.md) for the full backup and restore-safety runbook.

## Verification

Run the full production-parity gate before merging or deploying code changes:

```sh
npm run check:prod
```

This verifies the active Node.js version, installs the website and Studio dependencies with `npm ci`, runs linting, type checking, generated-type freshness, the production build, the full Vitest suite with enforced coverage thresholds, and the Sanity Studio build.

For faster local iteration after dependencies are installed, use:

```sh
npm run test:all
```

`test:all` includes `test:coverage`, so coverage regressions fail the standard local and CI gate. Run the browser suite separately with `npm run test:e2e`; Playwright starts `netlify serve` on dedicated port `4173` and exercises the built Netlify runtime.

Useful narrower commands:

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run test:unit
npm run test:integration
```

## Deployment

Netlify builds the website with:

```sh
npm ci && npm run build
```

Netlify and GitHub Actions use the Node.js version from `.nvmrc`. Do not set a separate `NODE_VERSION` override unless it matches `.nvmrc`.

Netlify must provide:

```txt
SANITY_PROJECT_ID
SANITY_DATASET
SANITY_TOKEN
SANITY_WRITE_TOKEN
IP_HASH_SALT
PUBLIC_TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
```

GitHub pull requests run `npm run check:prod` through `.github/workflows/pr-checks.yml`.

See [docs/deployment.md](docs/deployment.md) for the deployment checklist and environment notes.

## Dangerous Operations

`scripts/migrate-post-images.js` can write to Sanity. Treat it as a migration tool, not a routine command. Take a fresh backup and review the target dataset before running any import or migration against `production`.
