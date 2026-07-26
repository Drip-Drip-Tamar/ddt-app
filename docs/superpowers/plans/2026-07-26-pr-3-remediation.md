# PR #3 Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PR #3 production-safe by fixing authenticated preview, contact security, response headers, upstream timeouts, accessibility, metadata, and false-green verification without adding custom framework workarounds.

**Architecture:** Astro middleware owns request-scoped preview state and response headers. Astro Sessions, backed automatically by Netlify Blobs, store the authenticated preview flag; Sanity's official preview URL secret validator enables it, and request-specific Sanity clients are passed explicitly to data loaders. Remaining fixes use native Node abort signals, native disclosure focus behavior, and Playwright against Netlify's built production runtime.

**Tech Stack:** Astro 6.2, `@astrojs/netlify` 7, Astro Sessions, Sanity Client 7, `@sanity/preview-url-secret`, `@sanity/astro`, Node 22, Vitest 4, Playwright 1.61, Netlify CLI.

## Global Constraints

- Work on the existing `feature/improvement-plan` PR branch; do not create a parallel feature implementation.
- Keep the implementation small and conventional: use Astro Sessions, Astro middleware/locals, the official Sanity preview validator and Visual Editing component, native `AbortSignal.timeout()`/`AbortSignal.any()`, and Netlify CLI.
- Do not add custom cookie signing, session serialization, global mutable request state, patched framework internals, test-only production hooks, or arbitrary sleeps.
- `SANITY_TOKEN` is read-only after rotation; contact writes may use only `SANITY_WRITE_TOKEN`.
- Production contact handling requires non-blank `SANITY_WRITE_TOKEN` and `IP_HASH_SALT` and returns HTTP 503 before Turnstile or Sanity calls when either is absent.
- Draft content is enabled only by a valid Astro session established through Sanity's preview URL secret.
- Preview responses are private and non-cacheable; published responses retain their existing public edge caching.
- Existing GROQ projections and page rendering remain unchanged outside request-specific client selection.
- Every behavior change follows RED → GREEN → REFACTOR, with the failing test output recorded before production code changes.
- Use semantic commits with multiline descriptions.

---

### Task 1: Request-scoped Sanity clients and authenticated preview

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `astro.config.mjs`
- Modify: `studio/sanity.config.ts`
- Modify: `src/env.d.ts`
- Modify: `src/utils/sanity-config.ts`
- Modify: `src/utils/sanity-client.ts`
- Create: `src/pages/api/draft.ts`
- Create: `src/pages/api/disable-draft.ts`
- Delete: `src/components/SanityVisualEditing.tsx`
- Modify: `src/layouts/Layout.astro`
- Modify: `src/data/page.ts`
- Modify: `src/data/siteConfig.ts`
- Modify: `src/data/waterQuality.ts`
- Modify: `src/pages/[...slug].astro`
- Modify: `src/pages/news.astro`
- Modify: `src/pages/news/[slug].astro`
- Modify: `src/pages/posts/index.astro`
- Test: `tests/unit/sanity-client.test.ts`
- Create: `tests/unit/data-client-injection.test.ts`
- Create: `tests/integration/api-draft.test.ts`
- Create: `tests/integration/api-disable-draft.test.ts`

**Interfaces:**
- Produces: `createSanityReadClient({ preview: boolean }): SanityClient`.
- Produces: `createSanityWriteClient(): SanityClient`, which reads only `SANITY_WRITE_TOKEN` and throws when absent.
- Produces: `getSanityReadToken(): string | undefined` and `getSanityWriteToken(): string | undefined`, both trimming blank values.
- Produces: `App.Locals` with `isPreview: boolean` and `sanityClient: SanityClient`.
- Produces: `App.SessionData` with `sanityPreview: boolean`.
- Produces: `/api/draft` and `/api/disable-draft`.
- Consumes later: Task 2 middleware uses `createSanityReadClient()` and the typed locals/session key.

- [ ] **Step 1: Add direct dependencies**

Run:

```bash
npm install @sanity/preview-url-secret@^4.0.6
npm install --save-dev netlify-cli
```

Expected: `@sanity/preview-url-secret` is a direct runtime dependency and `netlify-cli` is a direct development dependency. Do not manually edit the lockfile.

- [ ] **Step 2: Write failing Sanity client tests**

Replace environment-global preview assertions in `tests/unit/sanity-client.test.ts` with behavior that proves:

```ts
expect(createSanityReadClient({ preview: false }).config()).toMatchObject({
  perspective: 'published',
  useCdn: true
})
expect(createSanityReadClient({ preview: false }).config().stega.enabled).toBe(false)

expect(createSanityReadClient({ preview: true }).config()).toMatchObject({
  perspective: 'drafts',
  useCdn: false,
  token: 'read-token'
})
expect(createSanityReadClient({ preview: true }).config().stega.enabled).toBe(true)

expect(() => createSanityWriteClient()).toThrow('SANITY_WRITE_TOKEN is required')
```

Also prove `createSanityWriteClient()` never falls back to `SANITY_TOKEN` by setting only the read token and expecting the throw.

- [ ] **Step 3: Run the focused client test and verify RED**

Run:

```bash
npm run test:unit -- tests/unit/sanity-client.test.ts
```

Expected: FAIL because the explicit read factory does not exist and the write factory still falls back.

- [ ] **Step 4: Implement explicit client factories**

Refactor `src/utils/sanity-config.ts` to a pure builder:

```ts
export interface SanityConfigOptions {
  projectId?: string
  dataset?: string
  token?: string
  preview: boolean
  studioUrl?: string
}

export function buildSanityConfig(options: SanityConfigOptions): ClientConfig {
  return {
    projectId: options.projectId,
    dataset: options.dataset || 'production',
    apiVersion: SANITY_API_VERSION,
    perspective: options.preview ? 'drafts' : 'published',
    useCdn: !options.preview,
    token: options.preview ? options.token : undefined,
    stega: {
      enabled: options.preview,
      studioUrl: options.studioUrl
    }
  }
}
```

Refactor `src/utils/sanity-client.ts` so the environment is read when a factory is called, not when preview state is decided:

```ts
const envReaders = {
  SANITY_PROJECT_ID: () => import.meta.env.SANITY_PROJECT_ID ?? process.env.SANITY_PROJECT_ID,
  SANITY_DATASET: () => import.meta.env.SANITY_DATASET ?? process.env.SANITY_DATASET,
  SANITY_TOKEN: () => import.meta.env.SANITY_TOKEN ?? process.env.SANITY_TOKEN,
  SANITY_WRITE_TOKEN: () => import.meta.env.SANITY_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN,
  SANITY_STUDIO_URL: () => import.meta.env.SANITY_STUDIO_URL ?? process.env.SANITY_STUDIO_URL
} as const

const readEnv = (name: keyof typeof envReaders): string | undefined => {
  const value = envReaders[name]()
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export const getSanityReadToken = () => readEnv('SANITY_TOKEN')
export const getSanityWriteToken = () => readEnv('SANITY_WRITE_TOKEN')

export function createSanityReadClient({ preview }: { preview: boolean }): SanityClient {
  const token = getSanityReadToken()
  if (preview && !token) throw new Error('SANITY_TOKEN is required for preview')
  return createClient(buildSanityConfig({
    projectId: readEnv('SANITY_PROJECT_ID'),
    dataset: readEnv('SANITY_DATASET'),
    token,
    preview,
    studioUrl: readEnv('SANITY_STUDIO_URL') || '/studio'
  }))
}

export function createSanityWriteClient(): SanityClient {
  const token = getSanityWriteToken()
  if (!token) throw new Error('SANITY_WRITE_TOKEN is required')
  return createClient({
    ...buildSanityConfig({
      projectId: readEnv('SANITY_PROJECT_ID'),
      dataset: readEnv('SANITY_DATASET'),
      preview: false
    }),
    useCdn: false,
    token
  })
}

export const client = createSanityReadClient({ preview: false })
```

Keep `startDevContentListener()` but default it to the published `client`. Remove `resolveIsPreviewContext`, `isPreviewContext`, `SANITY_PREVIEW_DRAFTS`, and the write-token fallback warning.

- [ ] **Step 5: Run the client test and verify GREEN**

Run:

```bash
npm run test:unit -- tests/unit/sanity-client.test.ts
```

Expected: PASS.

- [ ] **Step 6: Write failing endpoint tests**

In `tests/integration/api-draft.test.ts`, mock only `validatePreviewUrl` and the external Sanity client boundary. Use a session double with real state:

```ts
const values = new Map<string, unknown>()
const session = {
  get: vi.fn((key: string) => Promise.resolve(values.get(key))),
  set: vi.fn((key: string, value: unknown) => values.set(key, value)),
  destroy: vi.fn(() => values.clear())
}
```

Cover:

```ts
// missing read token
expect(response.status).toBe(401)
expect(session.set).not.toHaveBeenCalled()

// invalid secret
vi.mocked(validatePreviewUrl).mockResolvedValue({ isValid: false, redirectTo: '/' })
expect(response.status).toBe(401)
expect(session.set).not.toHaveBeenCalled()

// valid secret
vi.mocked(validatePreviewUrl).mockResolvedValue({ isValid: true, redirectTo: '/results' })
expect(response.status).toBe(302)
expect(response.headers.get('location')).toBe('/results')
expect(session.set).toHaveBeenCalledWith('sanityPreview', true, { ttl: 3600 })
```

In `tests/integration/api-disable-draft.test.ts`, assert `session.destroy()` is called and the response redirects to `/`.

- [ ] **Step 7: Run endpoint tests and verify RED**

Run:

```bash
npm run test:integration -- tests/integration/api-draft.test.ts tests/integration/api-disable-draft.test.ts
```

Expected: FAIL because both endpoints are absent.

- [ ] **Step 8: Implement Astro session configuration and endpoints**

Add to `astro.config.mjs`:

```js
session: {
  cookie: {
    name: 'ddt-preview',
    sameSite: 'lax',
    secure: true
  },
  ttl: 3600
}
```

The official Netlify adapter supplies the Netlify Blobs driver automatically; do not configure a storage driver.

Extend `src/env.d.ts`:

```ts
/// <reference types="astro/client" />
import type { SanityClient } from '@sanity/client'

declare global {
  namespace App {
    interface Locals {
      isPreview: boolean
      sanityClient: SanityClient
    }

    interface SessionData {
      sanityPreview: boolean
    }
  }
}

export {}
```

Implement `src/pages/api/draft.ts`:

```ts
import type { APIRoute } from 'astro'
import { validatePreviewUrl } from '@sanity/preview-url-secret'
import { createSanityReadClient, getSanityReadToken } from '@utils/sanity-client'

export const GET: APIRoute = async ({ request, session, redirect }) => {
  if (!getSanityReadToken()) return new Response('Draft mode missing token', { status: 401 })
  const result = await validatePreviewUrl(createSanityReadClient({ preview: true }), request.url)
  if (!result.isValid) return new Response('Invalid preview secret', { status: 401 })
  session?.set('sanityPreview', true, { ttl: 3600 })
  return redirect(result.redirectTo || '/', 302)
}
```

Implement `src/pages/api/disable-draft.ts`:

```ts
import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ session, redirect }) => {
  session?.destroy()
  return redirect('/', 302)
}
```

Update `studio/sanity.config.ts` to current Presentation configuration:

```ts
previewUrl: {
  initial: process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:3000',
  previewMode: {
    enable: '/api/draft'
  }
}
```

Do not use the deprecated `origin`, a public query parameter, or the deprecated `disable` Presentation option.

- [ ] **Step 9: Run endpoint tests and verify GREEN**

Run:

```bash
npm run test:integration -- tests/integration/api-draft.test.ts tests/integration/api-disable-draft.test.ts
```

Expected: PASS.

- [ ] **Step 10: Write failing client-injection tests**

Create `tests/unit/data-client-injection.test.ts` with a fake `SanityClient` whose `fetch` records calls. Prove each helper uses the supplied client rather than the singleton:

```ts
await getPageBySlug('results', fakeClient)
expect(fakeClient.fetch).toHaveBeenCalledWith(PAGE_BY_SLUG_QUERY, { slug: 'results' })

await fetchSiteConfig(fakeClient)
expect(fakeClient.fetch).toHaveBeenCalledWith(SITE_CONFIG_QUERY)

await getWaterSamples(fakeClient)
expect(fakeClient.fetch).toHaveBeenCalledWith(SAMPLES_QUERY)
```

Call `vi.resetModules()` before the site-config case and dynamically import that module so the existing module cache starts empty. Do not add a production cache-reset API for tests.

- [ ] **Step 11: Run injection tests and verify RED**

Run:

```bash
npm run test:unit -- tests/unit/data-client-injection.test.ts
```

Expected: FAIL because the helpers do not accept a client.

- [ ] **Step 12: Inject request clients through data and page call sites**

Use signatures:

```ts
export async function fetchData(sanityClient: SanityClient = client)
export async function getPageBySlug(slug?: string, sanityClient: SanityClient = client)
export async function getWaterSamples(sanityClient: SanityClient = client)
```

In request-rendered files use:

```ts
const { sanityClient, isPreview } = Astro.locals
```

Then:

- `Layout.astro`: call `fetchData(sanityClient)` and render the official `<VisualEditing />` from `@sanity/astro/visual-editing` only when `isPreview`.
- Delete `src/components/SanityVisualEditing.tsx`; do not keep custom iframe/query/history logic.
- `[...slug].astro`: call `getPageBySlug(slugParam, sanityClient)` and cache only when `!isPreview`.
- News and posts pages: call `sanityClient.fetch(...)` and cache only when `!isPreview`.
- Water-quality callers: pass `Astro.locals.sanityClient` where the helper is used during a request.

- [ ] **Step 13: Run injection, route, and type tests**

Run:

```bash
npm run test:unit -- tests/unit/data-client-injection.test.ts tests/unit/sanity-client.test.ts
npm run test:integration -- tests/integration/api-draft.test.ts tests/integration/api-disable-draft.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 14: Commit Task 1**

```bash
git add package.json package-lock.json astro.config.mjs studio/sanity.config.ts src/env.d.ts src/utils/sanity-config.ts src/utils/sanity-client.ts src/pages/api/draft.ts src/pages/api/disable-draft.ts src/layouts/Layout.astro src/data/page.ts src/data/siteConfig.ts src/data/waterQuality.ts src/pages src/components/SanityVisualEditing.tsx tests
git commit -m "feat(preview): add authenticated request-scoped draft mode" -m "Use Astro Sessions with Netlify Blobs and Sanity's preview URL validator. Inject request-specific Sanity clients and replace the custom visual-editing wrapper with the official Astro component."
```

---

### Task 2: Astro middleware and real response security headers

**Files:**
- Create: `src/utils/security-headers.ts`
- Create: `src/middleware.ts`
- Modify: `netlify.toml`
- Create: `tests/unit/middleware.test.ts`

**Interfaces:**
- Consumes: `createSanityReadClient({ preview })`, `App.Locals`, and session key `sanityPreview` from Task 1.
- Produces: `SECURITY_HEADERS: Readonly<Record<string, string>>`.
- Produces: `onRequest` middleware that assigns `locals.isPreview` and `locals.sanityClient`.

- [ ] **Step 1: Write failing middleware behavior tests**

Create `tests/unit/middleware.test.ts` and exercise the exported `onRequest` with session/next doubles.

Published case:

```ts
session.get.mockResolvedValue(false)
const response = await onRequest(context, next)
expect(context.locals.isPreview).toBe(false)
expect(response.headers.get('content-security-policy')).toContain("default-src 'self'")
expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
expect(response.headers.get('x-content-type-options')).toBe('nosniff')
expect(response.headers.get('cache-control')).toBe('public, s-maxage=300')
```

Preview case:

```ts
session.get.mockResolvedValue(true)
expect(context.locals.isPreview).toBe(true)
expect(response.headers.get('cache-control')).toBe('private, no-store')
expect(response.headers.get('cdn-cache-control')).toBe('no-store')
expect(response.headers.get('netlify-cdn-cache-control')).toBe('no-store')
expect(response.headers.get('vary')).toContain('Cookie')
```

Also assert an existing `Vary: Accept-Encoding` becomes `Accept-Encoding, Cookie`, not overwritten.

- [ ] **Step 2: Run middleware test and verify RED**

Run:

```bash
npm run test:unit -- tests/unit/middleware.test.ts
```

Expected: FAIL because middleware and the centralized header module do not exist.

- [ ] **Step 3: Implement centralized headers and middleware**

Move the current values from `netlify.toml` into:

```ts
export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'self' https://*.sanity.studio http://localhost:3333; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https://cdn.sanity.io https://*.tile.openstreetmap.org; connect-src 'self' https://*.api.sanity.io wss://*.api.sanity.io; frame-src https://challenges.cloudflare.com",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff'
} as const
```

In `src/middleware.ts`:

```ts
import { defineMiddleware } from 'astro:middleware'
import { createSanityReadClient, getSanityReadToken } from '@utils/sanity-client'
import { SECURITY_HEADERS } from '@utils/security-headers'

export const onRequest = defineMiddleware(async (context, next) => {
  const sessionPreview = (await context.session?.get('sanityPreview')) === true
  const isPreview = sessionPreview || (import.meta.env.DEV && Boolean(getSanityReadToken()))
  Object.assign(context.locals, {
    isPreview,
    sanityClient: createSanityReadClient({ preview: isPreview })
  })

  const response = await next()
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value)
  if (import.meta.env.PROD) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  if (isPreview) {
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('CDN-Cache-Control', 'no-store')
    response.headers.set('Netlify-CDN-Cache-Control', 'no-store')
    response.headers.append('Vary', 'Cookie')
  }
  return response
})
```

Deduplicate `Vary` values when appending Cookie. Keep the `netlify.toml` block for static/prerendered files and correct its comment so it no longer claims function coverage.

- [ ] **Step 4: Run middleware tests and verify GREEN**

Run:

```bash
npm run test:unit -- tests/unit/middleware.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/middleware.ts src/utils/security-headers.ts tests/unit/middleware.test.ts netlify.toml
git commit -m "fix(security): apply headers to Astro runtime responses" -m "Set CSP and related policies in global middleware for SSR and API routes while retaining Netlify header rules for static assets. Preview sessions now force private no-store caching."
```

---

### Task 3: Fail-closed contact writes and full upstream timeouts

**Files:**
- Modify: `src/pages/api/contact.ts`
- Modify: `src/utils/sanity-client.ts`
- Modify: `src/utils/upstream.ts`
- Modify: `tests/integration/api-contact.test.ts`
- Modify: `tests/unit/sanity-client.test.ts`
- Modify: `tests/unit/upstream.test.ts`

**Interfaces:**
- Consumes: `getSanityWriteToken()` and `createSanityWriteClient()` from Task 1.
- Produces: `hashIp(ip: string, salt: string): string` using HMAC-SHA256.
- Preserves: `fetchUpstream<T>(url, options): Promise<T>` and existing `UpstreamError` kinds.

- [ ] **Step 1: Write failing contact configuration and hashing tests**

Add cases to `tests/integration/api-contact.test.ts`:

```ts
vi.stubEnv('SANITY_WRITE_TOKEN', '')
vi.stubEnv('IP_HASH_SALT', 'test-salt')
const response = await POST(context)
expect(response.status).toBe(503)
expect(global.fetch).not.toHaveBeenCalled()
expect(createSanityWriteClient).not.toHaveBeenCalled()

vi.stubEnv('SANITY_WRITE_TOKEN', 'write-token')
vi.stubEnv('IP_HASH_SALT', '')
const response = await POST(context)
expect(response.status).toBe(503)
expect(global.fetch).not.toHaveBeenCalled()
expect(createSanityWriteClient).not.toHaveBeenCalled()
```

Add a literal HMAC assertion using Node's independently computed `createHmac('sha256', 'known-salt').update('203.0.113.1').digest('hex')`, and prove changing the salt changes the stored hash.

- [ ] **Step 2: Run contact tests and verify RED**

Run:

```bash
npm run test:integration -- tests/integration/api-contact.test.ts
```

Expected: FAIL because the route creates a write client at module load and accepts empty configuration.

- [ ] **Step 3: Implement request-time fail-closed configuration**

Remove the module-level write client. At the start of `POST`, before Turnstile or other external calls:

```ts
const writeToken = getSanityWriteToken()
const ipHashSalt = readRuntimeEnv('IP_HASH_SALT')
if (!writeToken || !ipHashSalt) {
  console.error('Contact endpoint is unavailable because required runtime configuration is missing')
  return jsonResponse({ ok: false, error: 'Contact form is temporarily unavailable.' }, 503)
}
const sanityClient = createSanityWriteClient()
```

Implement:

```ts
export function hashIp(ip: string, salt: string): string {
  return createHmac('sha256', salt).update(ip).digest('hex')
}
```

Pass the validated `ipHashSalt` explicitly. Remove the empty-salt fallback and warning.

- [ ] **Step 4: Run contact tests and verify GREEN**

Run:

```bash
npm run test:integration -- tests/integration/api-contact.test.ts
```

Expected: PASS, including zero external calls for configuration failures.

- [ ] **Step 5: Write the stalled-body timeout regression**

Add to `tests/unit/upstream.test.ts`:

```ts
vi.mocked(global.fetch).mockImplementationOnce(async (_url, init) => {
  const signal = init?.signal as AbortSignal
  return {
    ok: true,
    status: 200,
    json: () => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    })
  } as Response
})

await expect(fetchUpstream('/slow-body', { timeoutMs: 20 })).rejects.toMatchObject({
  kind: 'timeout'
})
```

- [ ] **Step 6: Run the upstream test and verify RED**

Run:

```bash
npm run test:unit -- tests/unit/upstream.test.ts
```

Expected: the new test hangs beyond the helper timeout or fails because body parsing is classified incorrectly.

- [ ] **Step 7: Use native abort signals through body consumption**

Refactor `fetchUpstream()`:

```ts
const timeoutSignal = AbortSignal.timeout(timeoutMs)
const signal = externalSignal
  ? AbortSignal.any([externalSignal, timeoutSignal])
  : timeoutSignal

try {
  const response = await fetch(url, { ...init, signal })
  if (!response.ok) throw new UpstreamError('non-ok', ..., url, response.status)
  return await response.json() as T
} catch (error) {
  if (timeoutSignal.aborted) throw new UpstreamError('timeout', ..., url)
  if (error instanceof UpstreamError) throw error
  if (signal.aborted) throw new UpstreamError('network', 'Request was aborted', url)
  if (error instanceof SyntaxError) throw new UpstreamError('invalid-json', ..., url)
  throw new UpstreamError('network', error instanceof Error ? error.message : 'Network request failed', url)
}
```

Keep status validation and `response.json()` inside the same `try`; no manual timer or event listener remains.

- [ ] **Step 8: Run focused security/runtime tests and verify GREEN**

Run:

```bash
npm run test:unit -- tests/unit/upstream.test.ts tests/unit/sanity-client.test.ts
npm run test:integration -- tests/integration/api-contact.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit Task 3**

```bash
git add src/pages/api/contact.ts src/utils/sanity-client.ts src/utils/upstream.ts tests/integration/api-contact.test.ts tests/unit/sanity-client.test.ts tests/unit/upstream.test.ts
git commit -m "fix(contact): fail closed and cover streamed timeouts" -m "Require the dedicated write token and HMAC salt before external calls. Keep native timeout signals active through JSON body consumption."
```

---

### Task 4: Native navigation focus and correct 404 metadata

**Files:**
- Modify: `src/scripts/mobile-nav.ts`
- Modify: `tests/unit/mobile-nav.test.ts`
- Modify: `src/layouts/Layout.astro`
- Modify: `src/pages/404.astro`
- Create: `e2e/404.spec.ts`

**Interfaces:**
- Extends `Layout.astro` props with `includeCanonical?: boolean`, defaulting to `true`.
- Removes `trapTabKey()` and its focusable-selector helpers.

- [ ] **Step 1: Replace focus-trap tests with native-order assertions**

Delete tests that require Tab wrapping. Add:

```ts
it('does not intercept Tab or Shift+Tab while the disclosure is open', () => {
  const { toggle, panel, first, last } = renderNav()
  mountMobileNav()
  openNav(toggle)
  expect(dispatchKeydown(first, { key: 'Tab', shiftKey: true }).defaultPrevented).toBe(false)
  expect(dispatchKeydown(last, { key: 'Tab' }).defaultPrevented).toBe(false)
})
```

Keep Escape-close and focus-return coverage.

- [ ] **Step 2: Run mobile navigation tests and verify RED**

Run:

```bash
npm run test:unit -- tests/unit/mobile-nav.test.ts
```

Expected: FAIL because open navigation still traps both key paths.

- [ ] **Step 3: Remove the disclosure focus trap**

Delete `FOCUSABLE_SELECTOR`, `getFocusableElements()`, `trapTabKey()`, and the Tab call from the open-panel keydown handler. Preserve:

- focus first link when opening;
- Escape closes and focuses the toggle;
- outside click closes;
- ARIA state and panel class updates.

- [ ] **Step 4: Run navigation tests and verify GREEN**

Run:

```bash
npm run test:unit -- tests/unit/mobile-nav.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write failing 404 metadata test**

Create `e2e/404.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('does not publish canonical social URLs for a not-found response', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist')
  expect(response?.status()).toBe(404)
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  await expect(page.locator('meta[property="og:url"]')).toHaveCount(0)
  await expect(page.locator('meta[property="twitter:url"]')).toHaveCount(0)
})
```

- [ ] **Step 6: Run the 404 metadata test and verify RED**

Run:

```bash
CI=1 npm run test:e2e -- e2e/404.spec.ts
```

Expected: FAIL because `Layout.astro` always emits URL metadata.

- [ ] **Step 7: Make URL metadata optional and disable it for 404**

Add `includeCanonical?: boolean` to Layout props and default it to `true`. Wrap canonical, `og:url`, and `twitter:url` in that condition. Pass `includeCanonical={false}` from `src/pages/404.astro`.

Do not configure a fake site origin and do not hard-code the production hostname.

- [ ] **Step 8: Run focused tests and build**

Run:

```bash
npm run test:unit -- tests/unit/mobile-nav.test.ts
CI=1 npm run test:e2e -- e2e/404.spec.ts
npm run build
```

Expected: PASS, and `dist/404.html` contains no localhost canonical/social URL tags.

- [ ] **Step 9: Commit Task 4**

```bash
git add src/scripts/mobile-nav.ts tests/unit/mobile-nav.test.ts src/layouts/Layout.astro src/pages/404.astro e2e/404.spec.ts
git commit -m "fix(a11y): restore native menu focus order" -m "Remove the modal-style focus trap from the mobile disclosure and omit canonical URL metadata from the prerendered 404 page."
```

---

### Task 5: Production-runtime E2E, coverage enforcement, and deployment contract

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `playwright.config.ts`
- Modify: `.github/workflows/pr-checks.yml`
- Modify: `e2e/results.spec.ts`
- Modify: `e2e/home.spec.ts`
- Modify: `README.md`
- Modify: `.env-sample`
- Modify: `docs/deployment.md`
- Modify: `CLAUDE.md`
- Modify: `AI-REFERENCE.md`
- Modify: `IMPROVEMENT-PLAN.md`
- Modify: `sessions/tasks/indexes/testing-quality.md`

**Interfaces:**
- Produces: `npm run serve:test` using the local `netlify-cli`.
- Changes: `test:all` runs coverage, not plain Vitest.
- Playwright base URL uses a project-specific fixed port and never reuses an arbitrary existing server.

- [ ] **Step 1: Strengthen Playwright chart assertions**

In `e2e/results.spec.ts`, collect runtime failures before navigation:

```ts
const pageErrors: string[] = []
const consoleErrors: string[] = []
page.on('pageerror', error => pageErrors.push(error.message))
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
```

For each chart canvas, assert browser-observable Chart.js rendering:

```ts
await expect.poll(async () => canvas.evaluate((node: HTMLCanvasElement) => ({
  width: node.width,
  height: node.height,
  hasInk: Array.from(
    node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data
  ).some((channel, index) => index % 4 !== 3 && channel !== 0)
}))).toMatchObject({ width: expect.any(Number), height: expect.any(Number), hasInk: true })
```

Also assert `width > 0`, `height > 0`, four environmental canvases, `pageErrors` empty, and `consoleErrors` empty. Keep API response stubbing at the network boundary.

- [ ] **Step 2: Verify the strengthened result test fails against a broken canvas**

Temporarily add this before `page.goto()`:

```ts
await page.addInitScript(() => {
  HTMLCanvasElement.prototype.getContext = () => null
})
```

This disables the real browser canvas context without adding a production hook. Confirm the new page-error/pixel assertions fail, then remove the temporary script before continuing.

Run:

```bash
npm run test:e2e -- e2e/results.spec.ts
```

Expected: FAIL for the intentionally broken mount, proving the test detects the regression. Restore the source immediately after the RED evidence.

- [ ] **Step 3: Serve the built Netlify runtime on a dedicated port**

Add:

```json
"serve:test": "netlify serve --port 4173",
"test:all": "npm run lint && npm run typecheck && npm run typegen:check && npm run build && npm run test:coverage"
```

Update `playwright.config.ts`:

```ts
use: { baseURL: 'http://127.0.0.1:4173', ... },
webServer: {
  command: 'npm run serve:test',
  url: 'http://127.0.0.1:4173',
  reuseExistingServer: false,
  timeout: 120_000
}
```

Use `netlify serve`, which builds and serves the production runtime, instead of Astro dev. Do not shell out to an unpinned global CLI.

- [ ] **Step 4: Run E2E against Netlify runtime and verify GREEN**

Run:

```bash
npm run test:e2e
```

Expected: all Playwright specs pass against port 4173, with no runtime page errors or console errors.

- [ ] **Step 5: Align CI with local verification**

Keep `npm run check:prod` in the test job; it now includes coverage through `test:all`. In the E2E job, ensure all required non-secret test values and secrets are present:

```yaml
SANITY_PROJECT_ID: ${{ secrets.SANITY_PROJECT_ID }}
SANITY_DATASET: ${{ secrets.SANITY_DATASET }}
SANITY_TOKEN: ${{ secrets.SANITY_TOKEN }}
SANITY_WRITE_TOKEN: ${{ secrets.SANITY_WRITE_TOKEN }}
IP_HASH_SALT: ${{ secrets.IP_HASH_SALT }}
```

Do not make the E2E job submit a real contact message.

- [ ] **Step 6: Correct environment and operational documentation**

Update all named documentation/config files consistently:

```txt
SANITY_TOKEN=<least-privilege read token>
SANITY_WRITE_TOKEN=<least-privilege token restricted to contact document creation>
IP_HASH_SALT=<high-entropy random secret>
```

State explicitly:

- the previously exposed write-capable token must be revoked before merge/deploy;
- `SANITY_TOKEN` is read-only and is used for authenticated draft reads/preview validation;
- `SANITY_WRITE_TOKEN` is used only by `/api/contact`;
- missing write token or salt makes contact return 503;
- Presentation enters through `/api/draft` and Astro Sessions;
- production E2E uses `netlify serve`;
- coverage thresholds are part of `test:all`.

Remove statements that `SANITY_TOKEN` writes, `SANITY_PREVIEW_DRAFTS` enables production preview, deploy previews automatically use drafts, or Astro dev is production-parity E2E.

Update the stale testing-quality task index and `IMPROVEMENT-PLAN.md` status so they describe the actual verification rather than the previous false-green claim.

- [ ] **Step 7: Run documentation/config consistency checks**

Run:

```bash
rg -n "SANITY_PREVIEW_DRAFTS|previewDrafts|falls back to SANITY_TOKEN|read/write access" README.md .env-sample docs CLAUDE.md AI-REFERENCE.md IMPROVEMENT-PLAN.md sessions studio src .github
```

Expected: no stale runtime guidance; any remaining `previewDrafts` text is historical context clearly marked as superseded.

- [ ] **Step 8: Run the full merge gate**

Run sequentially:

```bash
npm run lint
npm run typecheck
npm run typegen:check
npm run test:coverage
npm run build
npm run test:e2e
git diff --check
git status --short
```

Expected:

- lint has zero errors;
- typecheck has zero errors;
- generated schema/types are fresh;
- all Vitest files and coverage thresholds pass;
- Netlify build succeeds;
- all Playwright specs pass against the built runtime;
- no whitespace errors or unexpected generated changes.

- [ ] **Step 9: Commit Task 5**

```bash
git add package.json package-lock.json playwright.config.ts .github/workflows/pr-checks.yml e2e README.md .env-sample docs/deployment.md CLAUDE.md AI-REFERENCE.md IMPROVEMENT-PLAN.md sessions/tasks/indexes/testing-quality.md
git commit -m "test(ci): exercise the production Netlify runtime" -m "Enforce coverage in the standard gate, run Playwright against the built Netlify site, verify real Chart.js rendering, and align deployment documentation with required secrets."
```

---

## Final Review and Merge Gate

- [ ] Generate a whole-branch review package from PR head `143038a0cf08c0a257231c895578f89bf6ecc5cb` to the final remediation head.
- [ ] Dispatch an independent senior reviewer on the most capable available model.
- [ ] Require explicit verdicts for spec compliance, security, accessibility, runtime parity, and test integrity.
- [ ] If findings remain, dispatch one fix agent for the complete finding set, run one scoped re-review, and re-run the full merge gate.
- [ ] Verify the live PR head includes all remediation commits before claiming it is safe to merge.
