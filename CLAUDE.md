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

### Visual Editor
```bash
npm install -g @stackbit/cli  # Install Netlify Visual Editor CLI
stackbit dev                 # Run visual editor development server
```

## Architecture Overview

This is an **Astro + Sanity CMS** starter with **Netlify Visual Editor** integration. The architecture follows a JAMstack pattern with:

- **Frontend**: Astro static site generator with TypeScript
- **CMS**: Sanity.io headless CMS with structured content
- **Visual Editing**: Netlify Visual Editor (formerly Stackbit) for live preview
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
- `STACKBIT_PREVIEW=true`: Enable preview mode
- `SANITY_PREVIEW_DRAFTS=true`: Show draft content
- Automatically enabled in development and deploy previews

## Sanity Schema Architecture

Content models are defined in `studio/schemaTypes/`:
- **Page Components**: heroSection, cardsSection, ctaSection, logosSection, testimonialsSection
- **Content Types**: page, person, company, testimonial
- **Utilities**: siteConfig, header, footer
- **Base Types**: sectionBase, customImage, badge, actionButton, actionLink

Each section type extends from `sectionBase` providing consistent structure for visual editing annotations.

## Visual Editor Integration

The project is configured for Netlify Visual Editor via `stackbit.config.ts`:
- Sanity content source integration
- Model extensions in `.stackbit/models/`
- HMR passthrough for development
- Automatic studio deployment support