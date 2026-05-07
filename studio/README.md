# Drip Drip Tamar Sanity Studio

This workspace contains the Sanity Studio for the Drip Drip Tamar site.

The Studio is configured for:

```txt
projectId: i1ywpsq5
dataset: production
studioHost: ddt-app
```

## Setup

Install dependencies from this directory:

```sh
npm install
```

Run the Studio locally:

```sh
npm run dev
```

The Studio runs on `http://localhost:3333`.

Run the Astro site separately from the repo root:

```sh
npm run dev
```

The Presentation tool previews the site at `http://localhost:3000` by default. Set `SANITY_STUDIO_PREVIEW_URL` if a different preview origin is needed.

## Content Types

The Studio manages:

- pages and posts
- people, companies, testimonials, header, footer, and site configuration
- sampling sites and water samples
- contact messages submitted through the public contact form
- reusable page sections and component objects

Contact messages contain personal data and must be handled as private content.

## Commands

```sh
npm run dev       # local Studio
npm run build     # build Studio bundle
npm run deploy    # deploy Studio to Sanity hosting
```

## Safety

Before running any migration, import, or destructive content operation against `production`, take a fresh backup from the repo root:

```sh
npm run backup:sanity
```

See `../docs/backups.md` for the backup and restore-safety process.
