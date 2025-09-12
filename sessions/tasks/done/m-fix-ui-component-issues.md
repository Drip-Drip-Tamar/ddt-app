---
task: m-fix-ui-component-issues
branch: fix/ui-component-issues
status: completed
started: 2025-09-12
completed: 2025-09-12
created: 2025-09-12
modules: [components, studio]
---

# Fix UI Component Issues

## Problem/Goal
Fix three UI component issues affecting the visual presentation and usability of the site:
1. Header brand logo displays too large (currently displays as big as the source image)
2. Badge field in cards is incorrectly set as required in Sanity schema
3. Hero banners lack controls for sizing and image containment options

## Success Criteria
- [x] Header logo size is properly restricted/contained to appropriate dimensions
- [x] Badge field in cards schema is optional (not required)
- [x] Hero banners have Sanity controls for:
  - [x] Height/size configuration
  - [x] Background image containment type (contain/fill/cover)

## Context Manifest

### How Header Logo Display Currently Works

The Header component (`src/components/Header.astro`) displays the site logo using the ResponsiveImage component. When a user loads a page, the Header component receives logo data from Sanity via the `Header` interface defined in `types/index.ts:71-75`. The header logo can be either a Sanity image asset or a fallback title text.

The logo rendering flow works as follows: The Header component checks if `logo?.asset` or `logo?.src` exists (lines 16-31), and if found, renders a ResponsiveImage component with `imageType="logo"`. This ResponsiveImage component (`src/components/ResponsiveImage.astro`) then processes the image through the Sanity image optimization system.

The critical issue lies in the image sizing logic. The ResponsiveImage component uses the `sanity-image.ts` utility to generate optimized URLs and responsive srcsets. For logos specifically, it applies the `defaultSizes.logo` configuration from lines 97-100 in `src/utils/sanity-image.ts`, which sets responsive sizes of "150px" for mobile and "200px" for larger screens. However, the actual dimensions passed to the img element come from either explicit width/height props or the image's original dimensions (lines 53-54 in ResponsiveImage.astro).

The problem is that when no explicit dimensions are provided, the ResponsiveImage component falls back to default dimensions of 800x600 (lines 53-54), or uses the original image dimensions from the Sanity asset. This causes the logo to render at its source size rather than being constrained to appropriate header proportions. The Tailwind classes and CSS don't impose size limits, so large source images display at full size.

The Sanity image optimization system in `src/utils/sanity-image.ts` generates URLs with specific widths (like 150px, 200px for logos) but these are used in the srcset for responsive loading - the actual display size is still controlled by the width/height attributes on the img element, which default to the original image dimensions.

### How Card Badge Implementation Currently Works

The Card component (`src/components/Card.astro`) displays badges through the Badge component integration. When a card is rendered, it checks if a badge exists and has a label (line 36: `{badge && badge.label && <Badge {...badge} data-sb-field-path=".badge" />}`). The badge data comes from the `Card` interface in `types/index.ts:24-33`, where badge is defined as optional (`badge?: Badge`).

However, the Sanity schema configuration creates a conflict. In `studio/schemaTypes/card.ts:19-24`, the badge field is defined without any validation requirements, making it optional at the schema level. But the underlying Badge schema in `studio/schemaTypes/badge.ts:19-25` has `validation: (Rule) => Rule.required()` on the label field. This creates a confusing UX where content creators can create a badge object in a card, but are then forced to provide a label even if they don't want a badge.

The Badge component itself (`@components/Badge.astro` - referenced but not directly examined) expects a label to render anything meaningful. The Card component's conditional check ensures it only renders when both badge exists and badge.label exists, providing proper defensive programming.

The schema inheritance pattern means that once a user adds a badge to a card in Sanity, they cannot leave it empty or remove just the label - they must either provide a label or delete the entire badge object. This UX friction makes badges feel required when they should be optional.

### How Hero Section Background Image Handling Currently Works

Hero sections are implemented through a combination of the Hero component (`src/components/Hero.astro`) and the Section component (`src/components/Section.astro`). When a user creates a hero section, the Hero component wraps its content in the Section component, passing along all section-level properties including backgroundImage.

The architectural flow is: HeroSection data from Sanity → Hero component → Section component → BackgroundImage component. The Hero component (lines 11-14) spreads all non-content props (`...rest`) to the Section component, which includes backgroundImage and other styling properties inherited from the base Section interface.

The Section component (`src/components/Section.astro`) handles background images by conditionally rendering the BackgroundImage component (lines 17, 25). The BackgroundImage component (`src/components/BackgroundImage.astro`) then processes the image through the Sanity optimization system, generating a background-image CSS property with optimized URLs.

Currently, hero sections have NO size or containment controls. The Section component applies fixed padding classes (`py-16 sm:py-24`) for height, and the BackgroundImage always uses `bg-cover` CSS class (line 28), which crops images to fill the container while maintaining aspect ratio. There are no Sanity CMS controls to modify:
1. Section height/size (only fixed padding is used)
2. Background image containment behavior (hardcoded to `bg-cover`)
3. Background positioning or scaling options

The hero schema in `studio/schemaTypes/heroSection.ts` inherits from `SECTION_BASE_FIELDS` which includes backgroundImage support, but provides no additional controls for sizing or image behavior. The backgroundImage schema (`studio/schemaTypes/backgroundImage.ts`) only supports image selection and opacity, with no size or containment options.

### For New Implementation: What Needs to Connect

**Header Logo Sizing Fix:**
The ResponsiveImage component needs modification to respect imageType-specific sizing constraints. Currently the `defaultSizes.logo` configuration in sanity-image.ts provides responsive srcset sizes but doesn't constrain the actual rendered dimensions. The fix needs to either:
1. Add max-width/max-height CSS constraints to the logo imageType in ResponsiveImage
2. Override the default width/height fallback logic for logo imageType
3. Add logo-specific CSS classes in Header component

**Card Badge Schema Fix:**
The badge field in the card schema needs to be truly optional. Since the Badge schema has a required label field, and we want badges to be completely optional on cards, we need to modify the badge field validation. This requires understanding how Sanity handles nested object validation - making the parent optional while keeping child fields required when the parent exists.

**Hero Section Enhancement:**
The heroSection schema needs new fields for height/sizing and background image behavior. These should be added to the heroSection schema rather than the generic sectionBase to keep the feature specific to heroes. The Section and/or BackgroundImage components need to support these new options.

The Section component's styling logic needs to be extended to support variable heights and the BackgroundImage component needs support for different CSS background-size values (contain, fill/cover, etc.).

### Technical Reference Details

#### Component Interfaces & Function Signatures

```typescript
// ResponsiveImage component props (src/components/ResponsiveImage.astro:10-27)
interface Props {
    imageType?: 'card' | 'hero' | 'logo' | 'avatar' | 'custom';
    width?: number;
    height?: number;
    dimensions?: { width: number; height: number };
    // ... other props
}

// Header interface (types/index.ts:71-75)
interface Header {
    title?: string;
    logo?: CustomImage;
    navLinks?: Array<ActionButton | ActionLink>;
}

// Card interface (types/index.ts:24-33)  
interface Card {
    badge?: Badge; // This is optional
    heading?: string;
    // ... other fields
}

// Badge interface (types/index.ts:19-22)
interface Badge {
    label: string; // Required when badge exists
    theme?: 'primary' | 'secondary' | 'accent' | 'neutral';
}
```

#### Sanity Schema Current Structure

```typescript
// Card schema badge field (studio/schemaTypes/card.ts:19-24)
defineField({
    name: 'badge',
    title: 'Badge',
    type: 'badge', // References badge schema
    group: 'content',
    // No validation - should be optional
})

// Badge schema label field (studio/schemaTypes/badge.ts:19-25)  
defineField({
    name: 'label',
    title: 'Label', 
    type: 'string',
    validation: (Rule) => Rule.required(), // This forces requirement
    group: 'content',
})

// Hero section schema (studio/schemaTypes/heroSection.ts:11-31)
// Inherits backgroundImage from SECTION_BASE_FIELDS but no size/containment controls
```

#### Image Optimization Configuration

```typescript
// Default logo sizes (src/utils/sanity-image.ts:97-100)
logo: generateSizes([
    { maxWidth: 640, size: '150px' },
    { size: '200px' }
])

// ResponsiveImage default dimensions fallback (src/components/ResponsiveImage.astro:53-54)
const imgWidth = width || dimensions?.width || 800;  // Problematic fallback
const imgHeight = height || dimensions?.height || 600; // Problematic fallback
```

#### File Locations for Implementation

- **Header logo fix**: `src/components/ResponsiveImage.astro` and possibly `src/components/Header.astro`
- **Badge schema fix**: `studio/schemaTypes/badge.ts` validation rule modification  
- **Hero sizing controls**: 
  - Schema: `studio/schemaTypes/heroSection.ts` (add new fields)
  - Components: `src/components/BackgroundImage.astro` and `src/components/Section.astro` (support new options)
- **Configuration updates**: May need `src/utils/sanity-image.ts` adjustments for logo sizing

## User Notes
- Header logo currently displays as large as the source image file
- Card badge should be optional content
- Hero banners need flexible sizing and image containment controls for better visual control

## Work Log
<!-- Updated as work progresses -->
- [2025-09-12] Task created
- [2025-09-12] Fixed all three UI issues:
  - ResponsiveImage: Added imageType-specific default dimensions for logos (200x80) instead of 800x600
  - Badge schema: Removed required validation from label field to make badges fully optional
  - Hero section: Added height and backgroundImageFit controls to schema and components
- [2025-09-12] Added CSS constraints to logo (h-32 max-w-[400px]) for proper sizing
- [2025-09-12] Task completed successfully