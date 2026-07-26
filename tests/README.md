# Test Suite

The test suite covers the Astro + Sanity website, server API routes, data transforms, and operational backup helpers.

## Commands

Run the full gate:

```sh
npm run test:all
```

This runs:

```sh
npm run lint
npm run typecheck
npm run typegen:check
npm run build
npm run test:coverage
```

Run narrower checks:

```sh
npm test                 # all Vitest tests
npm run test:unit        # unit tests only
npm run test:integration # integration tests only
npm run test:watch       # Vitest watch mode
npm run test:coverage    # coverage report
npm run test:ui          # Vitest UI
```

## Structure

```txt
tests/
  setup/
    setup.ts
  unit/
    blocks.test.ts
    columns.test.ts
    location-config.test.ts
    page-data.test.ts
    portable-text.test.ts
    sanity-backup.test.ts
    sanity-client.test.ts
    sanity-image.test.ts
    site-config.test.ts
    water-quality.test.ts
  integration/
    api-contact.test.ts
    api-cso-live.test.ts
    api-cso-map.test.ts
    api-cso.test.ts
    api-prf.test.ts
    api-rainfall.test.ts
    api-tamar-level.test.ts
    news-rendering.test.ts
    page-rendering.test.ts
```

## Coverage Areas

- Sanity client configuration, preview perspective selection, and listener setup
- Sanity image URL and responsive image helpers
- Portable Text extraction and HTML rendering
- Water-quality chart data transforms and threshold configuration
- Site/page/location configuration queries and fallbacks
- Contact form validation, spam checks, IP hashing, and Sanity document creation
- Environment Agency and South West Water API route behavior and fallback handling
- News and page rendering data contracts
- Manual Sanity backup pathing, export-argument safety, and gitignore checks

## Test Environment

`tests/setup/setup.ts` stubs:

```txt
SANITY_PROJECT_ID=test-project-id
SANITY_DATASET=test-dataset
SANITY_TOKEN=test-token
```

It also provides global fetch and console mocks. Tests that need different environment behavior reset modules and override env values locally.

## CI

`.github/workflows/pr-checks.yml` installs root and Studio dependencies, then runs:

```sh
npm run test:all
```

The workflow expects these secrets:

```txt
SANITY_PROJECT_ID
SANITY_DATASET
SANITY_TOKEN
SANITY_WRITE_TOKEN
PUBLIC_TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
IP_HASH_SALT
```

The Playwright job runs against the built Netlify runtime. Its contact test is
render-only: it verifies the form contract but deliberately does not submit to
Cloudflare Turnstile or create a Sanity document.

## Current Baseline

The suite grows with the application. Use the Vitest summary from
`npm run test:coverage` as the current test and file count; coverage thresholds
are enforced by `vitest.config.ts`.

Known non-failing warnings in the full gate:

- ESLint warnings in legacy scripts/tests for console statements and explicit `any`.
- One Astro Check hint for `@sanity/eslint-config-studio` lacking local type declarations.
- Build warnings for the dynamic news route, generated CSS `@property`, and large chunks.
