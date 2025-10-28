# AI-REFERENCE.md

## TYPE SAFETY

### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler", // TS 5.0+
    "skipLibCheck": true,
    "allowJs": true,
    "jsx": "preserve",
    "jsxImportSource": "react" // or "solid-js", "preact"
  }
}
```

### Astro Check Setup
```bash
npm install --save-dev @astrojs/check typescript
astro check # Type check Astro files
```

### Sanity Type Generation
```ts
// With @sanity/codegen
import { defineQuery } from 'groq'
const query = defineQuery(`*[_type == 'post']`)
const posts = await client.fetch(query) // fully typed

// Generate types
npx sanity typegen generate
```

## ASTRO

### Component Architecture
```astro
---
// Frontmatter
import Component from '@components/Component.astro'
import { func } from '@utils/helper'
const { prop } = Astro.props
---
<Component {...prop} />
```

### Dynamic Routing
```astro
// src/pages/[...slug].astro
export async function getStaticPaths() {
  const pages = await getPages()
  return pages.map(page => ({
    params: { slug: page.slug || undefined },
    props: { page }
  }))
}
```

### Client Directives
```astro
<Component client:load />    // Hydrate immediately
<Component client:idle />    // Hydrate when idle  
<Component client:visible /> // Hydrate when visible
<Component client:media="(max-width: 50em)" /> // Media query
<Component client:only="react" /> // No SSR
```

### Configuration
```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'

export default defineConfig({
  output: 'static', // or 'server' or 'hybrid'
  integrations: [mdx(), react(), tailwind()],
  vite: { 
    envPrefix: 'PUBLIC_',
    build: { target: 'esnext' }
  },
  build: {
    assets: '_astro',
    assetsPrefix: 'https://cdn.example.com', // CDN
    inlineStylesheets: 'auto' // 'never' | 'auto' | 'always'
  },
  image: {
    domains: ['astro.build'],
    remotePatterns: [{ protocol: 'https' }]
  },
  scopedStyleStrategy: 'where', // or 'attribute'
  experimental: {
    contentCollectionCache: true
  }
})
```

### Data Fetching
```astro
---
// Build time
const data = await fetch('api').then(r => r.json())
// Collections with caching
import { getCollection } from 'astro:content'
const posts = await getCollection('blog')
---
```

### Middleware
```js
// src/middleware.ts
import { defineMiddleware, sequence } from 'astro/middleware'
import { trySerializeLocals } from 'astro/middleware'

const auth = defineMiddleware(async (context, next) => {
  // Validate locals
  trySerializeLocals(context.locals)
  
  if (!context.cookies.get('token')) {
    return context.redirect('/login')
  }
  return next()
})

const cache = defineMiddleware(async (context, next) => {
  const response = await next()
  response.headers.set('Cache-Control', 'max-age=3600')
  return response
})

export const onRequest = sequence(auth, cache)
```

### Integration Hooks
```js
export default function myIntegration() {
  return {
    name: 'my-integration',
    hooks: {
      'astro:config:setup': ({ updateConfig, addMiddleware, logger }) => {
        logger.info('Setting up integration')
        updateConfig({ build: { /* config */ } })
        addMiddleware({ entrypoint: 'my-middleware', order: 'pre' })
      },
      'astro:build:ssr': ({ entryPoints, middlewareEntryPoint }) => {}
    }
  }
}
```

### View Transitions
```astro
---
import { ViewTransitions } from 'astro:transitions'
---
<head>
  <ViewTransitions />
</head>

<!-- Handle SVG and image maps -->
<svg><a href="/page">Link</a></svg>
<img usemap="#map">
<map name="map">
  <area href="/page" coords="0,0,100,100">
</map>
```

## SANITY

### Schema Definition
```js
// studio/schemaTypes/post.js
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: Rule => Rule.required().min(10).max(80)
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 }
    }),
    defineField({
      name: 'body',
      type: 'array',
      of: [{ type: 'block' }]
    }),
    defineField({
      name: 'author',
      type: 'reference',
      to: [{ type: 'author' }]
    })
  ]
})
```

### Schema Composition
```js
// Reusable field definitions
const TITLE_FIELD = {
  name: 'title',
  type: 'string',
  validation: Rule => Rule.required()
}

const SEO_FIELDS = [
  defineField({ name: 'metaTitle', type: 'string' }),
  defineField({ name: 'metaDescription', type: 'text' })
]

// Compose schemas
defineType({
  name: 'page',
  type: 'document',
  fields: [
    TITLE_FIELD,
    ...SEO_FIELDS,
    defineField({ name: 'content', type: 'array' })
  ]
})
```

### GROQ Queries
```js
import groq from 'groq'
import { defineQuery } from 'groq'

// Basic with type inference
const typedQuery = defineQuery(`*[_type == "post"][0...10]`)

// With projections
groq`*[_type == "post"]{
  _id,
  title,
  "slug": slug.current,
  author->{ name },
  body[]{
    ...,
    _type == "image" => { asset-> }
  }
}`

// Filtering
groq`*[_type == "post" && slug.current == $slug][0]`
```

### Client Configuration
```js
// src/utils/sanity-client.ts
import { createClient } from '@sanity/client'

export const client = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn: import.meta.env.PROD, // CDN for production
  perspective: 'published', // or 'previewDrafts'
  token: import.meta.env.SANITY_TOKEN, // optional
  stega: { 
    enabled: import.meta.env.PUBLIC_SANITY_PREVIEW === 'true',
    studioUrl: '/studio'
  }
})
```

### Studio Configuration
```js
// studio/sanity.config.ts
import { defineConfig, isDev } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import schemaTypes from './schemas'

export default defineConfig({
  name: 'default',
  title: 'Studio',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.SANITY_STUDIO_DATASET,
  plugins: [
    structureTool(),
    ...(isDev ? [visionTool()] : []) // Vision only in dev
  ],
  schema: { types: schemaTypes },
  tools: (prev, { currentUser }) => {
    // Role-based tool access
    const isAdmin = currentUser?.roles.some(r => r.name === 'administrator')
    return isAdmin ? prev : prev.filter(t => t.name !== 'vision')
  }
})
```

### Sanity Functions
```ts
// sanity.blueprint.ts
import { defineBlueprint, defineDocumentFunction } from '@sanity/blueprints'

export default defineBlueprint({
  resources: [
    defineDocumentFunction({
      type: 'sanity.function.document',
      name: 'auto-tag',
      src: './functions/auto-tag',
      memory: 2,
      timeout: 30,
      event: {
        on: ['publish'],
        filter: "_type == 'post' && !defined(tags)",
        projection: '_id, title, content'
      }
    })
  ]
})
```

## SECURITY

### Environment Variables
```env
# Root .env
SANITY_PROJECT_ID=xxx
SANITY_DATASET=production
SANITY_TOKEN=xxx # Keep secret, never commit
PUBLIC_SANITY_PREVIEW=false # Safe to expose

# studio/.env  
SANITY_STUDIO_PROJECT_ID=xxx
SANITY_STUDIO_DATASET=production
SANITY_STUDIO_API_VERSION=2024-01-01
```

### Image Security
```js
// Astro config - restrict remote images
image: {
  domains: ['cdn.sanity.io', 'images.unsplash.com'],
  remotePatterns: [
    { protocol: 'https', hostname: '**.sanity.io' }
  ]
}
```

### CORS Configuration
```bash
sanity cors add https://yourdomain.com --credentials
```

### Middleware Validation
```js
import { trySerializeLocals } from 'astro/middleware'

export const onRequest = defineMiddleware((context, next) => {
  // Validate locals are serializable
  try {
    trySerializeLocals(context.locals)
  } catch (e) {
    console.error('Invalid locals:', e)
    return new Response('Server Error', { status: 500 })
  }
  return next()
})
```

## ERROR BOUNDARIES

### Comprehensive Error Handling
```astro
---
// src/pages/[...slug].astro
let page
try {
  page = await client.fetch(query, params)
} catch (error) {
  console.error('Fetch error:', error)
  
  // Different error responses
  if (error.statusCode === 404) {
    return Astro.redirect('/404')
  }
  if (error.statusCode === 401) {
    return Astro.redirect('/login')
  }
  
  // Generic error page
  return new Response('Error loading page', { status: 500 })
}

if (!page) return Astro.redirect('/404')
---
```

### Global Error Handler
```js
// For preview/dev environments
if (import.meta.env.DEV) {
  window.onerror = (err) => {
    console.error('[dev] Error:', err)
  }
  
  // React DevTools in iframe
  if (window.parent !== window) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = 
      window.parent.__REACT_DEVTOOLS_GLOBAL_HOOK__
  }
}
```

### Sanity Error Handling
```js
client.fetch(query)
  .catch(error => {
    if (error.response?.statusCode === 404) {
      // Document not found
      return null
    }
    // Re-throw other errors
    throw error
  })
```

## CACHING & PERFORMANCE

### Content Collection Caching
```js
// Cached getCollection
const cache = new Map()
export async function getCachedCollection(name) {
  if (!cache.has(name)) {
    const collection = await getCollection(name)
    cache.set(name, collection)
  }
  return cache.get(name)
}
```

### Image Optimization Caching
```js
// Images cached in node_modules/.astro/assets
// Clean with: rm -rf node_modules/.astro

// Skip optimization with query
import img from './image.jpg?raw'
```

### Build Performance
```js
// astro.config.mjs
export default defineConfig({
  experimental: {
    contentCollectionCache: true // Cache collections
  },
  build: {
    inlineStylesheets: 'auto' // Optimize CSS delivery
  }
})
```

### Sanity CDN & Caching
```js
client = createClient({
  useCdn: import.meta.env.PROD,
  stega: { 
    staleWhileRevalidate: 60 // seconds
  }
})
```

### Lazy Loading
```js
// Lazy initialize expensive operations
let expensiveResource
function getResource() {
  if (!expensiveResource) {
    expensiveResource = initializeResource()
  }
  return expensiveResource
}
```

## TESTING & DEBUGGING

### Vitest Configuration
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@utils': path.resolve(__dirname, './src/utils'),
      '@data': path.resolve(__dirname, './src/data'),
      '@components': path.resolve(__dirname, './src/components')
    }
  },
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' for DOM testing
    setupFiles: './tests/setup/setup.ts',
    pool: 'forks', // Isolate tests in separate processes
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '.astro/', 'studio/']
    }
  }
})
```

### Test Setup
```ts
// tests/setup/setup.ts
import { beforeEach, afterEach, vi } from 'vitest'

// Mock environment variables
vi.stubEnv('SANITY_PROJECT_ID', 'test-project')
vi.stubEnv('SANITY_DATASET', 'test')
vi.stubEnv('SANITY_TOKEN', 'test-token')

// Mock global APIs
global.fetch = vi.fn()

// Auto-cleanup
afterEach(() => {
  vi.clearAllMocks()
})
```

### Unit Testing Patterns
```ts
// tests/unit/utils.test.ts
import { describe, it, expect, vi } from 'vitest'
import { portableTextToHtml } from '@utils/portable-text'

describe('portableTextToHtml', () => {
  it('converts basic block to paragraph', () => {
    const blocks = [{
      _type: 'block',
      style: 'normal',
      children: [{ _type: 'span', text: 'Hello' }]
    }]
    expect(portableTextToHtml(blocks)).toBe('<p>Hello</p>')
  })

  it('applies multiple marks correctly', () => {
    const blocks = [{
      _type: 'block',
      children: [{
        _type: 'span',
        text: 'Bold italic',
        marks: ['strong', 'em']
      }]
    }]
    expect(portableTextToHtml(blocks))
      .toBe('<p><em><strong>Bold italic</strong></em></p>')
  })
})
```

### Integration Testing
```ts
// tests/integration/page-rendering.test.ts
import { describe, it, expect, vi } from 'vitest'

// Mock module dependencies
vi.mock('@utils/sanity-client', () => ({
  client: {
    fetch: vi.fn((query) => {
      if (query.includes('page')) {
        return Promise.resolve({
          title: 'Test Page',
          sections: []
        })
      }
      return Promise.resolve([])
    })
  }
}))

describe('Page Rendering', () => {
  it('fetches and structures page data', async () => {
    const { client } = await import('@utils/sanity-client')
    const page = await client.fetch('*[_type == "page"][0]')

    expect(page).toHaveProperty('title')
    expect(page.sections).toBeDefined()
  })
})
```

### Performance Measurement
```ts
// Playwright performance test
const duration = await page.evaluate((element: HTMLElement) => {
  const start = performance.now()
  // Perform operation
  element.click()
  const end = performance.now()
  return end - start
})
```

### Sanity Function Testing
```bash
# Test with real document
npx sanity functions test my-function \
  --document-id abc123 \
  --dataset production \
  --with-user-token

# Debug mode
npx sanity functions dev
```

### Debug Logging
```ts
// Sanity function debugging
console.log('Event data:', JSON.stringify(event.data, null, 2))
console.log('Generated result:', result)

// Conditional dev logging
if (import.meta.env.DEV) {
  console.log('Debug:', data)
}
```

### Test Commands
```bash
npm run test              # Run all tests once
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
npm run test:ui           # Open Vitest UI
npm run test:all          # Lint + typecheck + build + test
```

## INTEGRATION PATTERNS

### Page Generation from Sanity
```astro
// src/pages/[...slug].astro
---
import { client } from '@utils/sanity-client'
import Layout from '@layouts/Layout.astro'
import { componentMap } from '@utils/component-map'

export async function getStaticPaths() {
  const pages = await client.fetch(groq`
    *[_type == "page"]{ "slug": slug.current }
  `)
  return pages.map(page => ({
    params: { slug: page.slug || undefined }
  }))
}

const { slug } = Astro.params
const page = await client.fetch(groq`
  *[_type == "page" && slug.current == $slug][0]{
    ...,
    sections[]{ ..., _type }
  }
`, { slug })

if (!page) return Astro.redirect('/404')
---
<Layout title={page.title}>
  {page.sections?.map((section) => {
    const Component = componentMap[section._type]
    return Component ? <Component {...section} /> : null
  })}
</Layout>
```

### Component Mapping
```js
// src/utils/component-map.js
import Hero from '@components/sections/Hero.astro'
import Cards from '@components/sections/Cards.astro'
import Cta from '@components/sections/Cta.astro'

export const componentMap = {
  heroSection: Hero,
  cardsSection: Cards,
  ctaSection: Cta,
  // ...
}
```

### Preview Mode
```js
// src/utils/sanity-client.ts
const isPrev = import.meta.env.PUBLIC_SANITY_PREVIEW === 'true'

export const client = createClient({
  // ...
  perspective: isPrev ? 'previewDrafts' : 'published',
  token: isPrev ? import.meta.env.SANITY_TOKEN : undefined,
  stega: { enabled: isPrev }
})
```

### Real-time Updates (Dev)
```astro
---
if (import.meta.env.DEV) {
  const { enableLiveMode } = await import('@utils/live-mode')
  enableLiveMode()
}
---
```

## COMMANDS

### Development
```bash
npm run dev          # Astro dev server :3000
cd studio && sanity dev # Sanity Studio :3333
stackbit dev        # Visual editor
astro check         # Type checking
```

### Build/Deploy
```bash
npm run build       # Build Astro
npm run preview     # Preview build
sanity deploy       # Deploy Studio
sanity schema deploy # Deploy schema changes
sanity blueprints deploy # Deploy functions
```

### Sanity Management
```bash
sanity documents query "*[_type == 'post'][0]"
sanity dataset export production
sanity dataset import data.ndjson production
sanity cors add https://example.com
sanity functions test my-function --dataset production
```

### Content Operations
```js
// Create
await client.create({ _type: 'post', title: 'New' })

// Update with validation
await client.patch(id)
  .setIfMissing({ firstPublished: new Date().toISOString() })
  .set({ title: 'Updated' })
  .unset(['fieldToRemove'])
  .commit()

// Delete
await client.delete(id)

// Transaction
await client.transaction()
  .create({ _type: 'post', title: 'New' })
  .patch(id, p => p.set({ updated: true }))
  .commit()
```

## COMMON PATTERNS

### Portable Text Rendering
```astro
---
// Option 1: Custom utility (used in this project)
import { portableTextToHtml, extractTextFromPortableText } from '@utils/portable-text'

// Convert to HTML
const html = portableTextToHtml(post.body)

// Extract plain text for excerpts
const excerpt = extractTextFromPortableText(post.body, 200)
---
<div set:html={html} />

<!-- Option 2: astro-portabletext library -->
---
import { PortableText } from 'astro-portabletext'
import Image from '@components/Image.astro'

const components = {
  types: {
    image: Image,
    code: ({ value }) => `<pre><code>${value.code}</code></pre>`
  },
  marks: {
    link: ({ value, children }) =>
      `<a href="${value.href}" target="_blank">${children}</a>`
  }
}
---
<PortableText value={content} components={components} />
```

### Image Optimization
```astro
---
import { urlFor } from '@utils/sanity-image'
const imageUrl = urlFor(image)
  .width(800)
  .height(600)
  .format('webp')
  .quality(80)
  .url()
---
<picture>
  <source srcset={imageUrl} type="image/webp">
  <img src={urlFor(image).format('jpg').url()} alt={image.alt}>
</picture>
```

### Dynamic Imports
```astro
---
const { Content } = await post.render()
---
<Content components={{ img: Image }} />
```

### Router Patterns
```js
// Sanity router
import { route } from 'sanity/router'
const router = route('/', [
  route('/products/:productId'),
  route('/users/:userId')
])

router.encode({ productId: 54 }) // '/products/54'
router.decode('/products/54')    // { productId: 54 }
```

## OPTIMIZATION

### Static Generation
```js
export async function getStaticPaths() {
  // Fetch all at once
  const allContent = await client.fetch(groq`{
    "posts": *[_type == "post"],
    "pages": *[_type == "page"],
    "authors": *[_type == "author"]
  }`)
  
  // Process and return paths
  return [
    ...allContent.posts.map(/* ... */),
    ...allContent.pages.map(/* ... */)
  ]
}
```

### Query Optimization
```groq
// Limit projections
*[_type == "post"]{
  _id,
  title,
  "slug": slug.current,
  "author": author->name // Single field
}[0...10]

// Use coalesce for defaults
*[_type == "post"]{
  title,
  "excerpt": coalesce(excerpt, pt::text(body[0..2]))
}
```

### Bundle Optimization
```js
// Tree-shake unused exports
export { default as Component } from './Component.astro'

// Dynamic imports for code splitting
const { Component } = await import('./heavy-component')
```

### Prefetching
```js
// astro.config.mjs
export default defineConfig({
  prefetch: true, // Enable prefetching
  build: {
    inlineStylesheets: 'auto' // Inline small CSS
  }
})
```