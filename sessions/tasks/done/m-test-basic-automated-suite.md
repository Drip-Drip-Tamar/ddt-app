---
task: m-test-basic-automated-suite
branch: feature/test-basic-automated-suite
status: completed
created: 2025-09-12
started: 2025-09-12
completed: 2025-09-12
modules: [astro, sanity, testing, build, lint]
---

# Basic Automated Test Suite

## Problem/Goal
Create a comprehensive but fast set of automated tests that can be run after completing tasks to ensure nothing is broken. This includes static analysis, unit tests for key functionality, and smoke tests for critical paths.

## Success Criteria
- [x] Static analysis: TypeScript type checking (`npm run typecheck`)
- [x] Static analysis: ESLint/Prettier linting (`npm run lint`)
- [x] Static analysis: Astro build validation (`npm run build`)
- [x] Unit tests: Sanity client connection and queries
- [x] Unit tests: Image optimization utilities (sanity-image.ts)
- [x] Unit tests: Data transformation functions
- [x] Unit tests: Component prop validation
- [x] Smoke tests: Homepage renders without errors
- [x] Smoke tests: Dynamic page routing works ([...slug].astro)
- [x] Smoke tests: Sanity data fetching succeeds
- [x] Smoke tests: Critical assets load properly
- [x] Single npm command runs all test suites (`npm run test:all`)
- [x] Tests complete in under 2 minutes
- [x] Clear reporting showing pass/fail status per test
- [x] CI-ready configuration (can run in GitHub Actions)
- [x] Documentation on how to run and extend tests

## Context Manifest

### How the Current Application Works: Astro + Sanity CMS Architecture

This is a modern JAMstack application built with Astro and Sanity CMS, featuring a sophisticated visual editing system and server-side rendering. When a user requests a page, the request flows through several layers:

**Dynamic Page Routing System:** All page requests are handled by `src/pages/[...slug].astro`, which implements Astro's catch-all routing. The slug parameter (which can be undefined for the homepage) is extracted from `Astro.params`, normalized to handle both array and string formats, then passed to the `getPageBySlug()` function from `src/data/page.js`. This function constructs a GROQ query that fetches page data from Sanity, including all sections with their nested content using the comprehensive `SECTIONS` query fragment from `src/data/blocks.js`.

**Component Section Mapping:** The application uses a modular architecture where Sanity content types map directly to Astro components through a `componentMap` object: `cardsSection` → `Cards.astro`, `heroSection` → `Hero.astro`, etc. Each section is rendered dynamically with proper visual editing annotations (`data-sb-field-path` and `data-sb-object-id`) for both Sanity Presentation tool and Stackbit integration.

**Sanity Client Integration:** The `src/utils/sanity-client.ts` file configures the Sanity client with environment-based perspective switching. In development or deploy preview modes, it uses `previewDrafts` perspective to show unpublished content, while production uses `published`. The client includes sophisticated stega encoding for visual editing when in preview mode, connecting to either localhost:3333 or `/studio` for the studio URL. Critically, there's a real-time listener that subscribes to document changes and triggers Astro rebuilds by touching the Layout.astro file modification time.

**Image Optimization Pipeline:** The `src/utils/sanity-image.ts` contains a comprehensive image optimization system that generates responsive srcsets, handles multiple formats (WebP, JPG, PNG), and provides size-specific configurations for different use cases (card, hero, logo, avatar). It includes validation functions like `isSanityImage()` that check for proper Sanity image references, and generates URLs with automatic format detection and quality optimization (default 80%).

**Data Fetching Architecture:** The `src/data/` directory contains specialized fetching utilities: `page.js` handles page queries with comprehensive section population, `siteConfig.js` fetches global configuration including header/footer/monitoring settings, and `blocks.js` defines reusable GROQ fragments for complex nested queries. All queries are optimized to fetch only necessary data with proper image asset resolution.

**Layout and Configuration:** The main layout (`src/layouts/Layout.astro`) handles meta tag generation, loads external dependencies (Chart.js, Leaflet), and conditionally includes the SanityVisualEditing component only when in iframe contexts. The layout fetches global site configuration for headers, footers, and SEO metadata, with sophisticated canonical URL formatting and social media image optimization.

**TypeScript Integration:** The application uses strict TypeScript with comprehensive type definitions in `types/index.ts` covering all content models, sections, and data structures. Path aliases are configured in `tsconfig.json` for clean imports (`@components/*`, `@utils/*`, etc.).

**Build and Environment Configuration:** Astro is configured with server-side rendering enabled, Netlify adapter, React integration for interactive components, and Tailwind CSS via Vite plugin. The application supports multiple environment variables for Sanity configuration, preview modes, and visual editing toggles.

### For Test Suite Implementation: Critical Testing Points

Since we're implementing a comprehensive test suite, it needs to cover several critical architectural boundaries and data flows:

**Static Analysis Testing:** The application has no existing ESLint configuration, so we'll need to create one. TypeScript checking should use `@astrojs/check` (already installed) to validate `.astro`, `.ts`, and `.tsx` files. The build process using `astro build` serves as a comprehensive integration test that validates all routes, components, and data fetching.

**Sanity Integration Testing:** The Sanity client connection is critical - tests need to verify client initialization with proper configuration, query execution against the actual dataset, and real-time listener functionality. Mock data should match the exact structure returned by the GROQ queries in `src/data/blocks.js`.

**Image Optimization Testing:** The `sanity-image.ts` utilities are pure functions that can be unit tested effectively. Tests should cover URL generation, srcset creation, size calculations, format detection, and the crucial `isSanityImage()` validation logic that determines rendering paths.

**Data Transformation Testing:** The data fetching functions in `src/data/` perform critical transformations between Sanity's nested document structure and the TypeScript interfaces. Tests should verify proper query construction, data normalization, and error handling for missing or malformed data.

**Component Rendering Testing:** The dynamic component mapping in `[...slug].astro` is a critical failure point. Tests should verify that unknown section types are handled gracefully, that component props match expected interfaces, and that visual editing annotations are properly applied.

**Environment Configuration Testing:** With multiple environment variables controlling behavior (preview modes, Sanity configuration, visual editing flags), tests need to verify proper configuration loading and fallback behavior when required variables are missing.

### Technical Reference Details

#### Key Entry Points and Functions

**Page Routing:**
```typescript
// src/pages/[...slug].astro
export async function getStaticPaths() // Generates all possible routes
const getPageBySlug(slug?: string) // Fetches page data from Sanity
```

**Data Fetching Functions:**
```javascript
// src/data/page.js
fetchData() // Gets all pages
getPageById(id) // Single page by ID
getPageBySlug(slug) // Single page by slug (supports homepage)

// src/data/siteConfig.js
fetchData() // Global site configuration
```

**Image Utilities:**
```typescript
// src/utils/sanity-image.ts
urlFor(source): ImageUrlBuilder
getImageUrl(source, width, options?): string
generateSrcSet(source, widths?, options?): string
isSanityImage(source): boolean
```

#### Component Architecture

**Section Components:** Each implements the same interface with visual editing support
- `Cards.astro` - Grid layouts with optional images
- `Hero.astro` - Large banner sections with CTAs
- `Testimonials.astro` - Customer testimonial grids
- `Cta.astro` - Call-to-action sections
- `Logos.astro` - Animated/static logo strips
- `WaterQualityChart.astro` - Data visualization component

**Shared Components:**
- `ResponsiveImage.astro` - Handles both Sanity and regular images
- `Header.astro` / `Footer.astro` - Global navigation
- `SanityVisualEditing.tsx` - React component for visual editing

#### Data Structures

**Page Structure:**
```typescript
interface Page {
    _id: string;
    slug: Slug;
    title: string;
    sections: Array<CardsSection | CtaSection | HeroSection | LogosSection | TestimonialsSection | WaterQualitySection>;
    metaTitle?: string;
    metaDescription?: string;
    socialImage?: CustomImage;
}
```

**Image Structure:**
```typescript
interface CustomImage {
    _id?: string;
    src: string;
    alt?: string;
    dimensions?: { height: number; width: number };
}
```

#### Configuration Requirements

**Environment Variables:**
- `SANITY_PROJECT_ID` - Required for all Sanity operations
- `SANITY_DATASET` - Defaults to "production"
- `SANITY_TOKEN` - Required for preview/draft access
- `SANITY_PREVIEW_DRAFTS` - Boolean for draft content access
- `STACKBIT_PREVIEW` - Boolean for visual editing mode

**Package.json Scripts (Currently Missing Test Scripts):**
```json
{
    "dev": "astro dev",
    "build": "astro build", 
    "preview": "astro preview"
}
```

#### Test Implementation Locations

- **Test Configuration:** Create `vitest.config.ts` and update `package.json`
- **Unit Tests:** `tests/unit/` for utilities and data functions
- **Integration Tests:** `tests/integration/` for component and routing tests
- **Setup Files:** `tests/setup/` for test helpers and mocks
- **ESLint Config:** `.eslintrc.json` with Astro/TypeScript rules
- **Test Scripts:** Add to `package.json` scripts section

## User Notes
<!-- Any specific notes or requirements from the developer -->
- Should be simple and fast to run post-task
- Focus on high-value tests that catch common breakages
- Include static analysis as first line of defense
- Unit test critical utilities and data transforms
- Don't need comprehensive coverage initially, just basics

## Work Log

### 2025-09-12

#### Completed
- Implemented comprehensive Vitest-based test suite with 31 passing tests
- Created unit tests for Sanity image utilities (URL generation, srcset, validation)
- Created unit tests for Sanity client configuration and environment handling
- Created integration tests for page rendering and data fetching
- Added static analysis pipeline (TypeScript checking, ESLint, build validation)
- Implemented centralized image optimization system (`src/utils/sanity-image.ts`)
- Fixed component TypeScript interfaces to extend `SectionType`
- Updated components to use modern JavaScript methods (`substring` vs `substr`)
- Corrected HTML attributes (`srcset` vs `srcSet`, `class` vs `className`)
- Added proper TypeScript annotations to resolve build warnings
- Created comprehensive test documentation and setup guides
- Configured CI/CD ready test pipeline with `npm run test:all` command

#### Test Results Achieved
- **Test Files**: 3 passed (unit tests, integration tests, setup)
- **Total Tests**: 31 passed (100% pass rate)
- **Execution Time**: Under 400ms (well under 2-minute requirement)
- **TypeScript Errors**: 0 (clean type checking)
- **ESLint Issues**: 0 (clean linting)
- **Build Status**: Successful (no build errors)

#### Technical Implementation
- **Testing Framework**: Vitest with JSDOM environment
- **Coverage Provider**: V8 with HTML/JSON reporting
- **Mock Strategy**: Environment variables and module mocking
- **Test Structure**: Separated unit and integration test directories
- **CI Integration**: Configured for GitHub Actions compatibility

#### Code Quality Improvements
- Standardized component Props interfaces
- Fixed deprecated JavaScript method usage
- Corrected HTML attribute naming conventions
- Added explicit TypeScript type annotations
- Implemented comprehensive image optimization utilities

#### Documentation
- Created detailed test suite README with usage examples
- Documented all test commands and configuration options
- Provided troubleshooting guide and extension instructions
- Added performance benchmarks and CI/CD integration examples

#### Next Steps
- Monitor test performance in CI/CD pipeline
- Consider adding visual regression tests for UI components
- Expand test coverage for edge cases as needed
- Integrate with deployment verification workflows