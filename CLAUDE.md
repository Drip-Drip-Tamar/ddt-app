
@sessions/CLAUDE.sessions.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Astro Application
```bash
npm run dev         # Start development server on port 3000
npm run build       # Build for production
npm run preview     # Preview production build
npm run start       # Alias for dev
```

### Sanity Studio
```bash
cd studio
npm install         # Install studio dependencies
sanity dev          # Run studio locally on port 3333
```

### Sanity Data Management
```bash
npm run export            # Export Sanity content (backups/sanity/<timestamp>/)
node scripts/migrate-post-images.js  # Migrate old post image structure
```

### Testing and Quality Assurance
```bash
npm run test          # Run all tests once
npm run test:unit     # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:ui       # Open Vitest UI
npm run test:all      # Run lint, types, typegen, build, and coverage thresholds
npm run test:e2e      # Run Playwright against the built Netlify runtime
npm run serve:test    # Build and serve Netlify locally on port 4173
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript checking
```

### Visual Editing
```bash
cd studio && sanity dev      # Access via Studio → Presentation tab
```

## Architecture Overview

This is an **Astro + Sanity CMS** starter with Sanity Presentation tool visual editing. The architecture follows a JAMstack pattern with:

- **Frontend**: Astro SSR application with TypeScript and the Netlify adapter
- **CMS**: Sanity.io headless CMS with structured content
- **News System**: Blog/news functionality with posts and author management
- **Visual Editing**: Sanity Presentation tool (native)
- **Styling**: Tailwind CSS with DaisyUI components
- **Deployment**: Optimized for Netlify

## Key Architectural Patterns

### Dynamic Page Routing
Pages are dynamically generated through multiple routing systems:

**Main Site Pages** (`src/pages/[...slug].astro`):
- Fetches the requested page from Sanity through a request-scoped client
- Maps the catch-all slug to the requested page
- Component-based rendering using section mapping

**News System** (`src/pages/news/`):
- `src/pages/news.astro` - News listing page displaying all published posts
- `src/pages/news/[slug].astro` - Individual post pages with static generation
- SEO-optimized with meta tags and featured images

### Component Section Mapping
The site uses a modular section system where Sanity content types map to Astro components:
```typescript
const componentMap = {
    cardsSection: Cards,
    ctaSection: Cta,
    heroSection: Hero,
    logosSection: Logos,
    testimonialsSection: Testimonials
};
```

### Sanity Integration
- Client configuration in `src/utils/sanity-client.ts`
- Separate least-privilege read and contact-write clients
- Request-scoped published or authenticated draft reads
- Preview entry through `/api/draft` and Astro Sessions
- Native Presentation tool with live preview iframe
- `@sanity/astro/visual-editing` rendered only for authenticated preview requests

### Data Fetching Pattern
- `src/data/page.ts`: Page data fetching utilities
- `src/data/blocks.ts`: Block content utilities
- `src/data/siteConfig.ts`: Global site configuration
- `src/data/waterQuality.ts`: Water quality sample fetching and chart data transformation
- News posts: Direct Sanity queries in page components with GROQ

### Portable Text Utilities
The `src/utils/portable-text.ts` module provides centralized utilities for transforming Sanity's portable text format:

**Core Functions**:
- `extractTextFromPortableText(blocks, maxLength)` - Extracts plain text from portable text blocks for excerpt generation, with configurable truncation
- `portableTextToHtml(blocks)` - Transforms portable text blocks to HTML with support for headings (h1-h4), blockquotes, paragraphs, and inline marks (strong, em, underline, code)

**Mark Nesting Behavior**: When multiple marks are applied, they are processed in array order, but the last mark becomes the outermost HTML tag. For example, `marks=['strong', 'em']` produces `<em><strong>text</strong></em>`.

**Type Safety**: Includes TypeScript interfaces for `PortableTextBlock` and `PortableTextSpan` to ensure type-safe transformations across the application.

### News System Architecture
The news system provides blog functionality with the following components:

**Content Structure**:
- Posts managed through Sanity Studio with rich text editing
- Author information linked via person references
- Featured images with responsive optimization
- SEO metadata fields with fallback to content fields

**Display Components**:
- `src/components/PostCard.astro` - Card layout for featured posts
- `src/components/PostListItem.astro` - Horizontal list item layout for news feed
- Both components support responsive images and author attribution

**Data Transformation**:
- Centralized portable text utilities (`src/utils/portable-text.ts`) for consistent transformation across news pages
- `portableTextToHtml()` converts rich content to HTML in post detail pages
- `extractTextFromPortableText()` generates excerpts for listing pages when not explicitly provided
- Date formatting and localization with 'en-GB' locale
- Image optimization through sanity-image utility

### Image Optimization System
- `src/utils/sanity-image.ts`: Centralized image URL generation and optimization
- Responsive image support with automatic srcset generation
- WebP format conversion and quality optimization
- Predefined size configurations for common use cases (card, hero, logo, avatar)

### Water Quality Visualization
- `src/components/WaterQualityChart.astro`: Interactive Chart.js visualization of water sample data
- `src/data/waterQuality.js`: Data fetching, transformation, and chart configuration
- **Chart Features**:
  - Logarithmic Y-axis scale to accommodate extreme outliers while maintaining readability of normal values
  - Bacteria-type-based color grouping (E. coli in blue family, Enterococci in purple family)
  - Location differentiation via color shade (Calstock darker, Okel Tor lighter within each bacteria type)
  - EU Bathing Water Quality threshold annotations with colored zones
  - Unicode normalization for site name matching to handle invisible characters in labels
  - Client-side color application after data transformation

### TypeScript Path Aliases
```json
"@components/*": ["src/components/*"]
"@layouts/*": ["src/layouts/*"]
"@pages/*": ["src/pages/*"]
"@styles/*": ["src/styles/*"]
"@utils/*": ["src/utils/*"]
"@data/*": ["src/data/*"]
```

## Environment Configuration

### Required Environment Variables
```bash
# Root .env
SANITY_PROJECT_ID="..."      # Sanity project ID
SANITY_DATASET="..."         # Usually "production"
SANITY_TOKEN="..."           # Least-privilege read token for authenticated drafts
SANITY_WRITE_TOKEN="..."     # Contact-document creation only
IP_HASH_SALT="..."           # High-entropy secret for contact IP hashes

# studio/.env
SANITY_STUDIO_PROJECT_ID="..."  # Same as above
SANITY_STUDIO_DATASET="..."     # Same as above
```

`SANITY_WRITE_TOKEN` is consumed only by `/api/contact`. If it or `IP_HASH_SALT` is missing, the endpoint returns `503`. The previously exposed write-capable read token must be revoked before merge or deployment.

### Preview Configuration
- `SANITY_STUDIO_PREVIEW_URL`: Presentation preview URL (defaults to `http://localhost:3000`)
- Presentation calls `/api/draft`; that route validates the preview request with `SANITY_TOKEN` and enables request-scoped draft reads in Astro Sessions
- Deploy previews show published content unless an editor enters through Presentation

## Sanity Schema Architecture

Content models are defined in `studio/schemaTypes/`:
- **Page Components**: heroSection, cardsSection, ctaSection, logosSection, testimonialsSection
- **Content Types**: page, person, company, testimonial
- **Utilities**: siteConfig, header, footer
- **Base Types**: sectionBase, customImage, badge, actionButton, actionLink

Each section type extends from `sectionBase` providing consistent structure for visual editing.

## Visual Editing System

The Sanity Presentation tool is the sole visual-editing path, integrated directly into Sanity Studio via the bundled `sanity/presentation` module:
- **Configuration**: `studio/sanity.config.ts:19-51` - presentationTool configuration
- **Preview URL**: Configurable via `SANITY_STUDIO_PREVIEW_URL` environment variable
- **Document Resolution**: Maps pages by slug with automatic navigation
- **Frontend Integration**: `@sanity/astro/visual-editing`
- **Layout Integration**: `src/layouts/Layout.astro` renders visual editing only when `Astro.locals.isPreview` is authenticated
- **Access**: Via Studio interface → Presentation tab

### Key Implementation Details

**Frontend integration**:
- Uses the maintained `VisualEditing` integration from `@sanity/astro/visual-editing`
- Renders only for request-scoped authenticated previews
- Does not serialize a Sanity token into production HTML

**Studio Configuration (`studio/sanity.config.ts:19-51`)**:
- Preview URL with draft mode support
- Document resolution for page routing
- Location mapping for navigation context

**Environment Variables**:
- `SANITY_STUDIO_PREVIEW_URL`: Presentation tool preview URL (defaults to localhost:3000)
- `SANITY_TOKEN`: Read-only token used to validate Presentation entry and fetch drafts

### Dependencies Added
- **Studio**: presentation tool ships bundled with `sanity` (no separate `@sanity/presentation` dependency)
- **Frontend**: `@sanity/visual-editing: ^5.2.1`
- **Testing**: `vitest: ^4.1.10`, `@vitest/ui: ^4.1.10`, `@vitest/coverage-v8: ^4.1.10`
- **Testing Libraries**: `@testing-library/jest-dom: ^6.8.0`, `@testing-library/react: ^16.3.2`, `jsdom: ^28.0.0`
- **Code Quality**: `eslint: ^9.39.2`, `@typescript-eslint/*: ^8.54.0`
- **Compatibility**: Fixed `easymde: ^2.20.0` dependency issue post-upgrade

## Testing Architecture

### Test Suite Structure
```
tests/
├── setup/
│   └── setup.ts                    # Global test configuration and mocks
├── unit/
│   ├── sanity-image.test.ts        # Image utility unit tests
│   ├── sanity-client.test.ts       # Sanity client configuration tests
│   ├── water-quality.test.ts       # Water quality data transformation tests (31 tests)
│   └── portable-text.test.ts       # Portable text transformation tests (35 tests)
└── integration/
    ├── page-rendering.test.ts      # Page routing and rendering tests
    ├── news-rendering.test.ts      # News post rendering and SEO tests (27 tests)
    ├── api-contact.test.ts         # Contact form API endpoint tests (11 tests)
    └── api-prf.test.ts             # Pollution risk forecast API tests (10 tests)
```

### Test Coverage Areas
- **Unit Tests**: Sanity image utilities, client configuration, water quality data transformation, portable text conversion
- **Integration Tests**: Page data fetching, routing, component mapping, news post rendering, SEO fallback logic, API endpoint validation
- **API Endpoint Tests**: Contact form spam detection and validation, external API integration (Environment Agency), error handling
- **Static Analysis**: TypeScript checking, ESLint validation, build verification
- **Coverage Reports**: text, JSON, and HTML reports with enforced v8 thresholds
- **Browser Tests**: Playwright against `netlify serve`, including real Chart.js canvas pixels and browser error collection

### Test Configuration
- **Framework**: Vitest with Node environment
- **Setup**: Global mocks for Sanity environment variables, fetch API, and console methods
- **Path Aliases**: Configured with TypeScript path mappings (@utils, @data, @components, etc.) for consistent imports
- **Coverage**: Excludes `node_modules/`, `dist/`, `.astro/`, `studio/`, config files, and test files
- **CI/CD Gate**: `test:all` invokes `test:coverage`, so threshold regressions fail locally and in CI

### Key Testing Features
- Mocked Sanity client for consistent test environments
- Image optimization validation with URL generation testing
- Page routing simulation with data structure validation
- Component section mapping verification
- Water quality data transformation with log-scale clamping and null handling
- Portable text HTML conversion with mark nesting validation
- News post SEO fallback logic testing
- Date formatting validation for multiple locales
- Comprehensive edge case coverage (null values, empty arrays, invalid inputs)
- Error handling and graceful degradation scenarios

## PR Checks and CI

### GitHub Actions Workflow

Pull requests to the `main` branch automatically trigger comprehensive quality checks via GitHub Actions (`.github/workflows/pr-checks.yml`). This workflow runs the complete test suite and validation pipeline before code can be merged.

**Workflow Configuration:**
- **Trigger**: Pull requests and pushes to `main`, plus a weekly scheduled safety run
- **Environment**: Ubuntu latest with the Node version from `.nvmrc`
- **Caching**: npm dependencies cached based on `package-lock.json` hash
- **Command**: `npm run check:prod` for the production gate, plus a separate Playwright job

**What Gets Tested:**
1. **ESLint Validation** - Code quality and style checking
2. **TypeScript Type Checking** - Both Astro and TSC type validation
3. **Generated Type Validation** - Sanity schema and generated types must be fresh
4. **Build Validation** - Website and Studio production builds must complete
5. **Coverage Enforcement** - Unit and integration coverage thresholds must pass
6. **Production-runtime E2E** - Playwright exercises the built Netlify runtime on port 4173

**Expected Performance:**
- First run (no cache): ~2-3 minutes
- Subsequent runs (with npm cache): ~1-2 minutes
- Well under the 5-minute target for PR feedback

**Environment Variables:**
Tests use stubbed Sanity credentials from `tests/setup/setup.ts`, but the workflow also references GitHub Secrets for consistency:
- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_TOKEN`
- `SANITY_WRITE_TOKEN`
- `IP_HASH_SALT`

### API Endpoint Test Coverage

**Contact Form** (`tests/integration/api-contact.test.ts`):
- ✅ Successful form submission with all required fields
- ✅ Honeypot spam detection (silently rejects when `_website` field is filled)
- ✅ Time-based spam detection (rejects forms filled in < 3 seconds)
- ✅ Required field validation (name, email, message, consent)
- ✅ Email format validation using regex
- ✅ Content-Type handling (JSON, URL-encoded, multipart)
- ✅ Sanity client integration (document creation)
- ✅ Server error handling
- ✅ IP hashing for privacy-preserving security tracking
- ✅ Default topic assignment

**Pollution Risk Forecast** (`tests/integration/api-prf.test.ts`):
- ✅ Successful data fetching from Environment Agency API
- ✅ Risk level mapping (normal vs increased)
- ✅ Season detection (in-season vs out-of-season)
- ✅ EA API error handling (404, network failures)
- ✅ Cache header validation (15-minute cache, 1-hour stale-while-revalidate)
- ✅ Response metadata (attribution, license, timestamp)
- ✅ Malformed JSON handling
- ✅ Alternative risk level field locations
- ✅ Fallback to configuration labels
- ✅ Parallel site data fetching

**Test Execution:**
- Contact form tests: 11 tests covering validation, spam detection, error handling
- PRF tests: 10 tests covering API integration, caching, error scenarios
- Combined execution time: ~100-200ms additional to existing test suite

### Complementary to Netlify Checks

GitHub Actions PR checks **complement** (not replace) Netlify's existing deployment preview validation:

**GitHub Actions** (`.github/workflows/pr-checks.yml`):
- Runs `npm run check:prod` on every PR
- Validates code quality, types, generated files, coverage thresholds, and builds
- Runs Playwright against `netlify serve` with API responses stubbed at the network boundary
- Blocks merge if checks fail

**Netlify** (`netlify.toml`):
- Runs `npm ci && npm run build` on deploy previews
- Validates production build and deployment
- Generates preview URL for visual testing

The E2E suite does not submit a real contact message. Deploy previews render published content unless Presentation authenticates draft mode through `/api/draft` and Astro Sessions.

## Sessions System Behaviors

@CLAUDE.sessions.md
- Never add Claude Code attribution
