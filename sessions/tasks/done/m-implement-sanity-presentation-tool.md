---
task: m-implement-sanity-presentation-tool
branch: feature/implement-sanity-presentation-tool
status: completed
created: 2025-01-04
started: 2025-01-04
completed: 2025-01-04
modules: [studio, app, sanity-integration, visual-editing]
---

# Implement Sanity Presentation Tool for Visual Editing

## Problem/Goal
Add the Sanity Presentation tool to our Astro/Sanity CMS setup to enable editors to live edit content and see real-time previews of their work. This will improve the editor experience by providing immediate visual feedback as they make changes, rather than requiring them to publish and refresh to see results.

## Success Criteria
- [x] Presentation tool is installed and configured in Sanity Studio
- [x] Live preview functionality works for content editing
- [x] Editors can see changes in real-time as they type
- [x] Visual editing is properly integrated with the existing Astro frontend
- [x] Preview mode correctly shows draft content
- [x] Navigation between content and preview is seamless
- [x] Documentation is updated for editors on how to use the feature

## Context Manifest

### How Visual Editing Currently Works: Stackbit Integration

The application currently uses **Netlify Visual Editor (formerly Stackbit)** for live visual editing, but this is a separate system from Sanity's native Presentation tool. Here's how the current architecture works:

When editors want to make content changes, they can access the visual editing interface through Stackbit which provides live preview capabilities. The system is configured with a `stackbit.config.ts` file that defines how the visual editor connects to both the Sanity content source and the Astro frontend. The configuration uses a SanityContentSource that connects to project ID "i1ywpsq5" with the production dataset.

The visual editing annotations are already extensively implemented throughout the codebase. Every major component includes `data-sb-field-path` attributes that tell Stackbit exactly which content fields correspond to which visual elements. For example, in the main page route at `src/pages/[...slug].astro`, the page container has `data-sb-object-id={_id}` and each section gets `data-sb-field-path={sections.${idx}}`. This creates clickable regions in the visual editor.

The dynamic page routing works through `src/pages/[...slug].astro` which fetches pages from Sanity at build time using `getPageBySlug()`. Pages have a modular section system where Sanity content types like `heroSection`, `cardsSection`, etc. map to Astro components through a componentMap. Each section extends from `sectionBase` providing consistent structure for visual editing.

The Sanity client configuration in `src/utils/sanity-client.ts` already handles preview modes through environment variables. When `STACKBIT_PREVIEW` or `SANITY_PREVIEW_DRAFTS` is true, the client switches to the 'previewDrafts' perspective to show unpublished content. There's also a real-time listener system that watches for document changes and triggers Astro rebuilds by touching the Layout.astro file.

### Current Limitations with Stackbit vs Sanity Presentation

The current Stackbit setup requires editors to use the Netlify Visual Editor interface, which is separate from the Sanity Studio where they manage content. This creates a fragmented workflow where editors must switch between two different tools - Sanity Studio for content management and Stackbit for visual editing.

Additionally, Stackbit requires specific hosting and deployment configuration through Netlify, and the visual editing experience is dependent on the Stackbit service rather than being natively integrated with Sanity's ecosystem.

### For Sanity Presentation Implementation: What Needs to Connect

Since we're implementing the native Sanity Presentation tool, it will integrate directly into Sanity Studio as a new tool alongside the existing Structure tool and Vision tool. This means editors can manage content and see live previews all within the same Sanity interface.

The Presentation tool requires the `@sanity/presentation` plugin to be added to the Studio configuration in `studio/sanity.config.ts`. The tool will need a preview URL configuration pointing to the Astro frontend (likely http://localhost:3000 in development) and the deployed URL for production.

The existing visual editing annotations using `data-sb-field-path` attributes will need to be replaced or supplemented with Sanity's native overlay system. Sanity Presentation uses a different approach - it injects editing overlays directly into the preview iframe rather than relying on external annotation attributes.

The current Sanity client configuration already supports draft preview mode through the 'previewDrafts' perspective, but we'll need to ensure the Presentation tool can communicate with the frontend to enable live editing. This typically requires the frontend to listen for content updates from the Studio and refresh specific content regions without full page reloads.

The modular section system (heroSection, cardsSection, etc.) and component mapping in `src/pages/[...slug].astro` will work perfectly with Presentation - the tool can render the preview and inject editing interfaces for each section type. The challenge will be ensuring smooth real-time updates when editors make changes.

### Technical Reference Details

#### Current Studio Configuration

The studio at `studio/sanity.config.ts` currently includes:
```typescript
plugins: [structureTool(), visionTool(), markdownSchema()]
```

#### Current Client Configuration 

In `src/utils/sanity-client.ts`:
```typescript
export const sanityConfig: ClientConfig = {
    projectId: 'i1ywpsq5',
    dataset: 'production',
    useCdn: false,
    apiVersion: '2024-01-31',
    token: SANITY_TOKEN,
    perspective: isDev || isDeployPreview || previewDrafts ? 'previewDrafts' : 'published'
};
```

#### Page Structure & Component Mapping

Pages are fetched through GROQ queries in `src/data/page.js` and rendered dynamically in `src/pages/[...slug].astro` using this component mapping:
```typescript
const componentMap = {
    cardsSection: Cards,
    ctaSection: Cta,
    heroSection: Hero,
    logosSection: Logos,
    testimonialsSection: Testimonials,
    waterQualitySection: WaterQualityChart
};
```

#### Schema Structure

All section types extend from `sectionBase.ts` which provides consistent theming, background images, and width controls. The page schema at `studio/schemaTypes/page.ts` defines sections as:
```typescript
defineField({
    name: 'sections',
    type: 'array',
    of: [
        {type: 'cardsSection'},
        {type: 'ctaSection'},
        {type: 'heroSection'},
        {type: 'logosSection'},
        {type: 'testimonialsSection'},
        {type: 'waterQualitySection'},
    ],
})
```

#### Environment Variables

Required variables in `.env`:
- `SANITY_PROJECT_ID="i1ywpsq5"`
- `SANITY_DATASET="production"`
- `SANITY_TOKEN="[long-token-string]"`
- Optional: `SANITY_PREVIEW_DRAFTS="true"` for draft preview mode

#### File Locations

- **Studio Configuration**: `studio/sanity.config.ts`
- **Client Configuration**: `src/utils/sanity-client.ts`
- **Main Page Route**: `src/pages/[...slug].astro`
- **Schema Types**: `studio/schemaTypes/`
- **Section Components**: `src/components/`
- **Data Fetching**: `src/data/page.js`
- **Astro Config**: `astro.config.mjs`

#### Dependencies to Add

For Presentation tool implementation:
- `@sanity/presentation` - The presentation plugin for Studio
- Potentially `@sanity/visual-editing` - For enhanced visual editing capabilities

#### Integration Points

1. **Studio Plugin**: Add presentationTool() to studio configuration
2. **Preview URL**: Configure preview URL for the Astro frontend  
3. **Real-time Updates**: Ensure frontend can receive and handle live content updates
4. **Visual Overlays**: Replace or supplement existing Stackbit annotations with Sanity's overlay system
5. **Draft Mode**: Leverage existing draft preview configuration for live editing

## Context Files
<!-- Added by context-gathering agent or manually -->

## User Notes
<!-- Any specific notes or requirements from the developer -->
- Reference documentation: https://www.sanity.io/docs/visual-editing/configuring-the-presentation-tool
- Need to research the tool capabilities and requirements
- Focus on improving the editor experience with live preview functionality
- Ensure compatibility with existing Astro/Sanity setup

## Work Log

### 2025-01-04

#### Completed
- Installed and configured @sanity/presentation plugin in Studio
- Created SanityVisualEditing.tsx component with smart iframe detection
- Configured presentation tool with preview URL and document resolution
- Implemented dual visual editing system supporting both Sanity and Stackbit
- Fixed dependency issues after Sanity upgrade (easymde compatibility)
- Updated CLAUDE.md documentation with comprehensive dual editing details
- Verified live preview functionality works correctly in both systems

#### Technical Implementation
- **Studio Configuration** (`studio/sanity.config.ts:19-51`): Added presentationTool with preview URL and document resolution
- **Visual Editing Component** (`src/components/SanityVisualEditing.tsx`): Smart activation only in Sanity iframe context
- **Layout Integration** (`src/layouts/Layout.astro:83`): Conditionally loads visual editing component
- **Dependencies Added**: @sanity/presentation (^2.0.0), @sanity/visual-editing (^3.0.3), easymde (^2.20.0)

#### Architecture Decisions
- Chose dual visual editing approach to preserve existing Stackbit integration
- Implemented iframe detection to prevent conflicts between editing systems
- Used existing SANITY_PREVIEW_DRAFTS parameter for consistency
- Maintained backward compatibility with all existing visual editing annotations

#### Final Status
- All success criteria met and verified
- Both visual editing systems functional and conflict-free
- Documentation updated for future developers
- Ready for production deployment