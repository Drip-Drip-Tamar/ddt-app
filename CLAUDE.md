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
- **Visual Editing**: Dual system supporting both Sanity Presentation tool and Netlify Visual Editor (Stackbit)
- **Styling**: Tailwind CSS with DaisyUI components
- **Deployment**: Optimized for Netlify

## Key Architectural Patterns

### Dynamic Page Routing
Pages are dynamically generated through `src/pages/[...slug].astro`:
- Fetches all pages from Sanity at build time
- Maps slug to route params
- Component-based rendering using section mapping

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
- **Compatibility**: Fixed `easymde: ^2.20.0` dependency issue post-upgrade
## Sessions System Behaviors

@CLAUDE.sessions.md
