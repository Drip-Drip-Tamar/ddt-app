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
npm run create-project    # Create new Sanity project
npm run import {projectId}  # Import content to Sanity
npm run export            # Export Sanity content
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
npm run test:all      # Run linting, type checking, build validation, and tests
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript checking
```

### Visual Editing Options
```bash
# Option 1: Sanity Presentation Tool (Native)
cd studio && sanity dev      # Access via Studio → Presentation tab

# Option 2: Netlify Visual Editor (Stackbit)
npm install -g @stackbit/cli  # Install Netlify Visual Editor CLI
stackbit dev                 # Run visual editor development server
```

## Architecture Overview

This is an **Astro + Sanity CMS** starter with **dual visual editing** integration. The architecture follows a JAMstack pattern with:

- **Frontend**: Astro static site generator with TypeScript
- **CMS**: Sanity.io headless CMS with structured content
- **News System**: Blog/news functionality with posts and author management
- **Visual Editing**: Dual system supporting both Sanity Presentation tool and Netlify Visual Editor (Stackbit)
- **Styling**: Tailwind CSS with DaisyUI components
- **Deployment**: Optimized for Netlify

## Key Architectural Patterns

### Dynamic Page Routing
Pages are dynamically generated through multiple routing systems:

**Main Site Pages** (`src/pages/[...slug].astro`):
- Fetches all pages from Sanity at build time
- Maps slug to route params
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
- Real-time listener for page updates in development
- Preview drafts support for visual editing
- Perspective switching (published vs previewDrafts)
- Native Presentation tool with live preview iframe
- SanityVisualEditing component for client-side editing features

### Data Fetching Pattern
- `src/data/page.js`: Page data fetching utilities
- `src/data/blocks.js`: Block content utilities
- `src/data/siteConfig.js`: Global site configuration
- News posts: Direct Sanity queries in page components with GROQ

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
- Portable text to HTML conversion for rich content
- Automatic excerpt generation from post body when not provided
- Date formatting and localization
- Image optimization through sanity-image utility

### Image Optimization System
- `src/utils/sanity-image.ts`: Centralized image URL generation and optimization
- Responsive image support with automatic srcset generation
- WebP format conversion and quality optimization
- Predefined size configurations for common use cases (card, hero, logo, avatar)

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
SANITY_TOKEN="..."           # Editor token with read/write access

# studio/.env
SANITY_STUDIO_PROJECT_ID="..."  # Same as above
SANITY_STUDIO_DATASET="..."     # Same as above
```

### Preview Configuration
- `STACKBIT_PREVIEW=true`: Enable Stackbit visual editing mode
- `SANITY_PREVIEW_DRAFTS=true`: Enable Sanity draft content preview
- `SANITY_STUDIO_PREVIEW_URL`: Preview URL for Presentation tool (defaults to localhost:3000)
- Automatically enabled in development and deploy previews

## Sanity Schema Architecture

Content models are defined in `studio/schemaTypes/`:
- **Page Components**: heroSection, cardsSection, ctaSection, logosSection, testimonialsSection
- **Content Types**: page, person, company, testimonial
- **Utilities**: siteConfig, header, footer
- **Base Types**: sectionBase, customImage, badge, actionButton, actionLink

Each section type extends from `sectionBase` providing consistent structure for visual editing annotations.

## Dual Visual Editing System

The project supports two visual editing approaches that can be used independently or together:

### Sanity Presentation Tool (Native)
Integrated directly into Sanity Studio via `@sanity/presentation` plugin:
- **Configuration**: `studio/sanity.config.ts:19-51` - presentationTool configuration
- **Preview URL**: Configurable via `SANITY_STUDIO_PREVIEW_URL` environment variable
- **Document Resolution**: Maps pages by slug with automatic navigation
- **Client Component**: `src/components/SanityVisualEditing.tsx` - Handles iframe detection and editing activation
- **Layout Integration**: `src/layouts/Layout.astro:83` - Conditionally loads visual editing
- **Access**: Via Studio interface → Presentation tab

### Netlify Visual Editor (Stackbit)
External visual editing service with extensive annotation system:
- **Configuration**: `stackbit.config.ts` - Sanity content source integration
- **Annotations**: Comprehensive `data-sb-field-path` attributes throughout components
- **Model Extensions**: Custom definitions in `.stackbit/models/`
- **HMR Support**: Live preview with hot module replacement
- **Access**: Via `stackbit dev` command or deployed interface

### Key Implementation Details

**SanityVisualEditing Component (`src/components/SanityVisualEditing.tsx:8-75`)**:
- Detects iframe context and `SANITY_PREVIEW_DRAFTS` parameter
- Only activates within Sanity Studio's Presentation tool
- Provides history API integration for navigation
- Shows development status indicator when active
- Prevents conflicts with Stackbit visual editing

**Studio Configuration (`studio/sanity.config.ts:19-51`)**:
- Preview URL with draft mode support
- Document resolution for page routing
- Location mapping for navigation context

**Environment Variables**:
- `SANITY_STUDIO_PREVIEW_URL`: Presentation tool preview URL (defaults to localhost:3000)
- `SANITY_PREVIEW_DRAFTS`: Enables draft content in preview mode
- `STACKBIT_PREVIEW`: Enables Stackbit visual editing mode

### Dependencies Added
- **Studio**: `@sanity/presentation: ^2.0.0`
- **Frontend**: `@sanity/visual-editing: ^3.0.3`
- **Testing**: `vitest: ^3.2.4`, `@vitest/ui: ^3.2.4`, `@vitest/coverage-v8: ^3.2.4`
- **Testing Libraries**: `@testing-library/jest-dom: ^6.8.0`, `@testing-library/react: ^16.3.0`, `jsdom: ^26.1.0`
- **Code Quality**: `eslint: ^9.35.0`, `@typescript-eslint/*: ^8.43.0`
- **Compatibility**: Fixed `easymde: ^2.20.0` dependency issue post-upgrade

## Testing Architecture

### Test Suite Structure
```
tests/
├── setup/
│   └── setup.ts           # Global test configuration and mocks
├── unit/
│   ├── sanity-image.test.ts  # Image utility unit tests
│   └── sanity-client.test.ts # Sanity client configuration tests
└── integration/
    └── page-rendering.test.ts # Page routing and rendering tests
```

### Test Coverage Areas
- **Unit Tests**: Sanity image utilities, client configuration validation
- **Integration Tests**: Page data fetching, routing, component mapping
- **Static Analysis**: TypeScript checking, ESLint validation, build verification
- **Coverage Reports**: HTML and JSON coverage reports with v8 provider

### Test Configuration
- **Framework**: Vitest with JSDOM environment
- **Setup**: Global mocks for Sanity environment variables
- **Coverage**: Excludes `node_modules/`, `dist/`, `.astro/`, `studio/`, config files
- **CI/CD Ready**: Designed for automated pipeline integration

### Key Testing Features
- Mocked Sanity client for consistent test environments
- Image optimization validation with URL generation testing
- Page routing simulation with data structure validation
- Component section mapping verification
- Error handling and edge case coverage
## Sessions System Behaviors

@CLAUDE.sessions.md
