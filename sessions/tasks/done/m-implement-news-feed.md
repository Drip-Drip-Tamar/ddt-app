---
task: m-implement-news-feed
branch: feature/implement-news-feed
status: completed
created: 2025-09-12
started: 2025-09-12
completed: 2025-09-12
modules: [src/pages, studio/schemaTypes, src/components, src/data]
---

# Implement News Feed

## Problem/Goal
Implement a news feed feature to display posts on the News page. The system should allow content editors to create and manage news posts through Sanity CMS, while visitors can browse a list of posts and read full articles by clicking through to individual post pages.

## Success Criteria
- [x] Create a "post" content type in Sanity Studio with necessary fields (title, excerpt, content, date, author, featured image)
- [x] Create a News page that displays a list of all published posts
- [x] Display key metadata for each post (title, excerpt, date, author, thumbnail)
- [x] Make each post card clickable to navigate to the full post page
- [x] Create individual post pages with full content display
- [x] Implement responsive design for both list and detail views
- [x] Add proper SEO metadata for posts
- [x] Tests pass
- [x] Documentation updated

## Context Manifest

### How The Current System Works: Page-Based Architecture with Sanity CMS

This system operates on a sophisticated page-based architecture where all routes are dynamically generated through Sanity CMS content. When a user visits any URL, the request is handled by a single dynamic router at `src/pages/[...slug].astro` which fetches content based on the slug parameter.

The core routing flow works as follows: When a user visits `/news`, the `[...slug].astro` file receives `"news"` as the slug parameter. It then calls `getPageBySlug("news")` from `src/data/page.js`, which executes a GROQ query against Sanity: `*[_type == "page" && slug.current == "news"]`. If a page exists with that slug, it returns the page data including its sections array. If no page is found, the system redirects to a 404 page.

Each page in Sanity has a `sections` array that contains modular content blocks. These sections are mapped to Astro components through a `componentMap` object in the slug router:

```javascript
const componentMap = {
    cardsSection: Cards,
    ctaSection: Cta, 
    heroSection: Hero,
    logosSection: Logos,
    testimonialsSection: Testimonials,
    waterQualitySection: WaterQualityChart
};
```

The system then iterates through the sections array and renders the appropriate component for each section type. Each component receives the section data as props and renders accordingly.

**Critical architectural insight**: There is ALREADY a basic blog infrastructure in place. The `postType` schema exists in `studio/schemaTypes/postType.ts` with fields for title, slug, publishedAt, image, and body. There's also a basic posts list page at `src/pages/posts/index.astro` that fetches and displays posts with a simple layout. However, there are NO individual post detail pages yet - the links in the post list point to `/posts/{slug}` but those routes don't exist.

### For News Feed Implementation: Integration Points and Patterns to Follow

Since we're implementing a news feed, we need to understand that this system has TWO distinct content approaches:

1. **Page-Based Content**: Static pages created in Sanity that get their own URL routes (like About, Contact, etc.)
2. **Post-Based Content**: Blog-like articles that exist as individual documents but are aggregated into listing views

For the news feed, we need both approaches. We need:
- A "News" page (page-based) that displays a list of posts
- Individual post detail pages (post-based) for full article views

**Current Post Schema Structure** (`studio/schemaTypes/postType.ts`):
```typescript
{
  name: 'post',
  title: 'Post', 
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
    { name: 'publishedAt', type: 'datetime' },
    { name: 'image', type: 'image' },
    { name: 'body', type: 'array', of: [{type: 'block'}] }
  ]
}
```

This schema is minimal and needs enhancement for a proper news feed with excerpt, author, featured image, and SEO metadata.

**Existing Post Query Pattern** (`src/pages/posts/index.astro`):
```javascript
const POSTS_QUERY = `*[
  _type == "post" 
  && defined(slug.current)
]|order(publishedAt desc)[0...12]{_id, title, slug, publishedAt}`;
```

This query fetches posts but doesn't include the additional fields we'll need for a rich news feed display.

### Visual Editing Integration Patterns

The system supports dual visual editing through both Sanity Presentation tool and Stackbit. Every component includes visual editing annotations:
- `data-sb-object-id={_id}` for document-level editing
- `data-sb-field-path={fieldPath}` for field-level editing
- Conditional loading of `SanityVisualEditing` component when in draft preview mode

For the news feed components, we need to follow this pattern by adding appropriate `data-sb-field-path` attributes to all editable content areas.

### Component Architecture and Styling Patterns

All content sections extend from a base `Section` component that provides consistent theming, background images, and width controls. The Section component (`src/components/Section.astro`) handles:
- Theme switching (light/dark)
- Background image overlays with opacity
- Width variants (full/inset)  
- Responsive padding classes
- Visual editing annotations

**Cards Component Pattern** is the most relevant existing pattern for news feed implementation. The `Cards` section (`src/components/Cards.astro`) demonstrates how to:
- Display a grid of content items with configurable columns
- Handle heading and body content with Markdown support
- Use ResponsiveImage component for optimized images
- Apply consistent card styling through the `Card` component

The Card component (`src/components/Card.astro`) shows the pattern for individual content items:
- Badge support for categorization
- Heading and body content
- Call-to-action buttons/links
- Responsive image handling
- Theme variants (light/dark/transparent)
- Text alignment options

### Image Optimization System

The system has a sophisticated image optimization setup through `src/utils/sanity-image.ts`:
- Automatic WebP conversion and quality optimization
- Responsive srcset generation with predefined breakpoints
- Size presets for different use cases (`card`, `hero`, `logo`, `avatar`)
- Smart format detection and Sanity CDN integration

For news feed images, we should use the `card` image type which generates responsive sizes optimized for grid layouts:
```javascript
defaultSizes.card = generateSizes([
    { maxWidth: 640, size: '100vw' },
    { maxWidth: 768, size: '50vw' }, 
    { maxWidth: 1024, size: '33vw' },
    { size: '25vw' }
])
```

### Data Fetching Patterns

The system uses a consistent pattern for data fetching through utility functions in `src/data/`:
- `page.js` - Page content queries with section expansion
- `blocks.js` - Reusable GROQ query fragments for images and sections  
- `siteConfig.js` - Global site configuration

All queries use GROQ with sophisticated projection to fetch exactly the needed data. The `IMAGE` and `SECTIONS` fragments in `blocks.js` show how to properly query Sanity images with all metadata needed for the ResponsiveImage component.

### Server-Side Rendering Configuration

The Astro config shows the site runs in SSR mode with Netlify adapter:
```javascript
{
  output: 'server',
  adapter: netlify(),
  integrations: [sanity(sanityConfig), react()]
}
```

This means pages are generated on-demand rather than statically, allowing for real-time content updates from Sanity. The Sanity client is configured with live preview support in development/preview contexts.

### Technical Reference Details

#### Key File Locations
- Dynamic router: `src/pages/[...slug].astro`
- Existing posts list: `src/pages/posts/index.astro`  
- Component mapping: `src/pages/[...slug].astro:27-34`
- Image optimization: `src/utils/sanity-image.ts`
- Data queries: `src/data/page.js`, `src/data/blocks.js`
- Schema types: `studio/schemaTypes/`
- Type definitions: `types/index.ts`

#### Data Structures to Extend
- Need to add `Post` interface to `types/index.ts`
- Need to extend `Page.sections` union to include potential news section types
- Consider adding `NewsSection` interface for dedicated news display components

#### Integration Requirements
- Posts need individual detail page routes (likely `/posts/[slug].astro`)
- News page needs to be created as a regular page in Sanity with slug "news"
- Post schema needs enhancement with excerpt, author reference, featured image
- Need new components for post cards and post detail layouts
- All components must include visual editing annotations

#### Configuration Extensions
- Component map needs entries for any new section types
- Sanity studio may need post preview configuration
- Type definitions need Post interface and section extensions

## User Notes
- Posts should be displayed on the News page with key metadata
- Each post should be clickable to open as a full page for reading
- Follow existing patterns in the codebase for Sanity integration and component structure

## Work Log

### 2025-09-12

#### Completed
- Enhanced post schema with comprehensive fields (excerpt, author, featuredImage, SEO metadata)
- Created News listing page at /news with single-column layout and post cards
- Created individual post pages at /news/[slug] with full content display
- Built PostCard and PostListItem components for different layout contexts
- Implemented responsive design with left-aligned images
- Added SEO optimization with meta tags and social sharing support
- Created migration script for existing posts to use new schema structure
- Successfully migrated "Hello World" post to new featuredImage structure
- Updated CLAUDE.md documentation with news system architecture details

#### Decisions
- Used single-column layout for news feed to accommodate rich content display
- Implemented dual component approach (PostCard vs PostListItem) for flexible layouts
- Enhanced post schema with customImage type for featuredImage instead of simple image reference
- Added comprehensive SEO fields with fallback to content fields
- Created migration script to handle existing posts without breaking changes

#### Technical Implementation
- Schema: Enhanced postType.ts with excerpt, author reference, featuredImage (customImage), SEO fields
- Pages: /news.astro (listing), /news/[slug].astro (individual posts)
- Components: PostCard.astro, PostListItem.astro with responsive image support
- Data: GROQ queries for posts with author population and image optimization
- Migration: scripts/migrate-post-images.js for backward compatibility

#### Next Steps
- All requirements completed successfully
- Task ready for final review and merge