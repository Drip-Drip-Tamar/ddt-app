# PR #3 Remediation Design

**Status:** Approved

**Date:** 2026-07-25

## Objective

Resolve the production-safety, preview-mode, accessibility, and verification
gaps found during the pre-merge review of PR #3 without broad unrelated
refactoring.

The resulting branch must:

- enable Sanity Presentation through an authenticated, request-scoped preview
  session;
- fail contact writes closed when their dedicated production secrets are
  absent;
- apply security headers to actual Astro SSR and API responses;
- enforce upstream timeouts through response-body consumption;
- restore normal keyboard access to the mobile-menu toggle;
- make CI exercise coverage, the built Netlify runtime, and actual chart
  initialization;
- correct the identified local E2E, 404 metadata, deployment documentation,
  and task-tracker inconsistencies.

## Constraints

- `SANITY_TOKEN` becomes read-only after the previously exposed token is
  rotated.
- Contact writes may use only `SANITY_WRITE_TOKEN`; there is no production
  fallback.
- Production IP hashing requires a non-empty, high-entropy `IP_HASH_SALT`.
- A missing write token or salt returns HTTP 503 before Turnstile or Sanity
  network calls.
- Draft content is never enabled by an unauthenticated query parameter.
- Preview responses are never publicly cached.
- Published requests keep the existing public edge-cache behavior.
- Existing GROQ projections and page behavior remain unchanged outside preview
  client selection.
- Use framework and platform primitives instead of custom session formats,
  patched internals, global request state, or test-only product hooks.
- All behavior changes are implemented test-first.

## Architecture

### 1. Authenticated, request-scoped Sanity preview

Sanity Studio will enable preview through `/api/draft` rather than by appending
`?SANITY_PREVIEW_DRAFTS=true` to a public page URL.

The enable endpoint will:

1. require the read token;
2. validate the Sanity-generated preview URL using
   `@sanity/preview-url-secret`;
3. store a short-lived preview flag using Astro's built-in Sessions API;
4. redirect only to the validated `redirectTo` path.

Astro owns the session ID cookie and keeps session data server-side. The
official Netlify adapter automatically uses Netlify Blobs as its session
storage, so the application does not implement cookie signing, session
serialization, or a custom storage driver. Session cookie lifetime and
security attributes are configured through Astro's standard `session.cookie`
configuration.

`/api/disable-draft` destroys the Astro session and redirects to `/`.

Global Astro middleware reads the preview flag from `context.session` on every
request and writes these request-scoped values to `Astro.locals`:

```ts
interface Locals {
  isPreview: boolean;
  sanityClient: SanityClient;
}
```

Local development may enable preview automatically when its read token is
available. Production enables preview only through an active Astro session.
The current raw query parameter and production-wide
`SANITY_PREVIEW_DRAFTS` decision are removed from request behavior.

The Sanity client module will expose explicit factories:

```ts
createSanityReadClient({ preview: boolean }): SanityClient
createSanityWriteClient(): SanityClient
```

The published client uses the published perspective without stega. The preview
client requires the read token, uses the drafts perspective, enables stega,
and bypasses the CDN.

The existing singleton-client call sites will be made request-aware through
explicit dependency injection:

- `Layout.astro` passes `Astro.locals.sanityClient` to site-config loading and
  renders visual editing only when `Astro.locals.isPreview`.
- `src/data/page.ts`, `siteConfig.ts`, and `waterQuality.ts` accept a
  `SanityClient` argument with the published client as the non-request default.
- news and posts pages call queries through `Astro.locals.sanityClient`.
- page-level cache decisions use `Astro.locals.isPreview`.

This keeps preview state request-scoped and avoids global mutable state in the
Netlify function.

### 2. Global SSR/API security headers

`src/middleware.ts` will call `await next()`, then add the security headers to
the returned response. This is the supported Astro 6 middleware pattern and
ensures on-demand pages and API routes receive the policy.

The policy remains centralized in `src/utils/security-headers.ts` and includes:

- Content-Security-Policy;
- Referrer-Policy;
- X-Content-Type-Options;
- Strict-Transport-Security in production.

The `netlify.toml` header block remains for static and prerendered assets because
Netlify does not apply it to SSR/function responses. Tests will prove both the
middleware header values and preview cache overrides.

For a valid preview session, middleware overwrites caching with:

```text
Cache-Control: private, no-store
CDN-Cache-Control: no-store
Netlify-CDN-Cache-Control: no-store
Vary: Cookie
```

Published requests retain the cache headers chosen by their page or API route.

### 3. Fail-closed contact configuration

Contact runtime configuration will be resolved inside the request handler,
before parsing calls reach Turnstile or Sanity.

Production requires:

- `SANITY_WRITE_TOKEN`;
- `IP_HASH_SALT`.

The request handler uses a direct guard for missing or blank values and returns
an HTTP 503 JSON response. It logs the configuration failure without secret
values. The write-client factory no longer reads or falls back to
`SANITY_TOKEN`.

IP identifiers will use HMAC-SHA256:

```ts
createHmac('sha256', salt).update(ip).digest('hex')
```

The salt is injected explicitly into the hashing function. This makes the
security dependency testable and prevents an empty-salt fallback.

The README, deployment guide, `.env-sample`, GitHub Actions environment list,
and contributor guidance will describe:

- read-only `SANITY_TOKEN`;
- dedicated `SANITY_WRITE_TOKEN`;
- high-entropy `IP_HASH_SALT`;
- required pre-deploy token rotation and minimum privileges.

### 4. Complete upstream timeout coverage

`fetchUpstream()` will use the Node 22 platform primitives
`AbortSignal.timeout()` and `AbortSignal.any()` rather than managing its own
timer and listener. The combined signal remains attached to the fetch response
while all of these operations finish:

1. initial fetch;
2. status validation;
3. JSON body consumption.

If the timeout signal aborts while parsing the body, the helper reports a
timeout rather than invalid JSON. A regression test will return response
headers immediately and stall `json()` until the signal aborts.

### 5. Mobile navigation keyboard behavior

The mobile navigation is a disclosure, not a modal dialog. Its custom Tab and
Shift+Tab focus trap will be removed.

Opening may continue to move focus to the first menu link. Native document
order then permits Shift+Tab back to the visible toggle. Escape continues to
close the menu and return focus to the toggle. Unit tests will assert normal
sequential focus behavior rather than the old loop.

### 6. Verification and E2E integrity

#### Coverage

`test:all` will invoke `test:coverage`, making the configured Vitest thresholds
part of the required CI job.

#### Production runtime

Netlify CLI will be pinned as a development dependency. Playwright will run
against:

```bash
BROWSER=none netlify serve --offline --context production --port 3100
```

`netlify serve` builds and serves the production Netlify output, including SSR
functions. The default base URL moves to port 3100 and
`reuseExistingServer` is disabled. Developers who intentionally want to reuse
a server can supply Playwright's base URL explicitly rather than relying on
implicit port detection.

Representative smoke tests will assert successful responses for `/`,
`/results`, `/map`, `/news`, and one JSON API route, covering the runtime graph
that previously produced deploy-only 502s.

#### Chart initialization

The results E2E test will use browser-observable behavior without adding
test-only state to production code. It will:

- wait for the expected stubbed data routes;
- assert each Chart.js canvas has a non-zero backing size and rendered,
  non-transparent pixels;
- fail on page errors and unexpected console errors.

Static canvas/container presence alone is no longer considered success.

### 7. Metadata and repository cleanup

- The 404 page will be `noindex` and omit canonical, Open Graph URL, and
  Twitter URL metadata rather than publishing a localhost origin.
- `sessions/tasks/h-test-pr-automation.md` will be marked completed with its
  implementation reference.
- The duplicate active entry will be removed from
  `sessions/tasks/indexes/testing-quality.md`.

## Error Handling

- Invalid Sanity preview URLs return 401 and do not create an Astro session.
- Missing preview configuration returns 503 without revealing token values.
- Missing or expired Astro sessions are treated as published requests.
- Missing contact security configuration returns 503 before upstream calls.
- Upstream aborts during either fetch or body parsing produce the existing
  timeout error kind.
- Chart mount failures render the existing fallback UI and surface a browser
  error that E2E observes.

## Test Strategy

Each behavior follows a red-green cycle.

### Unit and integration tests

- `/api/draft` valid, invalid, and missing-read-token paths using Astro
  sessions;
- `/api/disable-draft` session destruction;
- middleware published versus preview locals, headers, and cache policy;
- published and preview Sanity client configuration;
- data helpers using an injected request client;
- contact 503 behavior with zero Turnstile/Sanity calls;
- dedicated write-token usage and HMAC IP hashing;
- stalled response-body timeout;
- native mobile-menu focus order;
- rendered Chart.js canvas output and browser-error detection;
- 404 metadata omission.

### Full verification

The final verification sequence is:

1. focused tests for each changed subsystem;
2. `npm run lint`;
3. `npm run typecheck`;
4. `npm run typegen:check`;
5. `npm run build`;
6. `npm run test:coverage`;
7. production-runtime Playwright suite through `netlify serve`;
8. a local HTTP probe confirming CSP/referrer headers on SSR and API responses,
   no-store preview caching, and no preview island on published requests;
9. `git diff --check`;
10. clean working-tree confirmation.

## Operational Handoff

The code can enforce safe behavior, but these external actions remain required
before deployment:

1. revoke the previously exposed write-capable `SANITY_TOKEN`;
2. create a least-privilege read token for `SANITY_TOKEN`;
3. create a least-privilege contact-write token for `SANITY_WRITE_TOKEN`;
4. generate and configure a high-entropy value for `IP_HASH_SALT`;
5. configure the variables for Netlify runtime and relevant GitHub Actions
   contexts;
6. verify Sanity Studio points to the deployed `/api/draft` endpoint;
7. confirm Netlify Blobs session storage is available to the deployed Astro
   runtime;
8. run one real Presentation session and one real contact submission after
   deployment.

Until those actions are complete, the contact endpoint intentionally returns
503 and production preview remains unavailable rather than falling back to an
unsafe state.

## Out of Scope

- broad dependency-upgrade remediation for advisories already present on the
  base branch;
- live EA/SWW contract tests;
- changes to Sanity schemas or content models;
- unrelated chart or page redesign;
- publishing, pushing, or merging the branch.
