import imageUrlBuilder from '@sanity/image-url';
import type { ImageUrlBuilder } from '@sanity/image-url/lib/types/builder';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

// Get Sanity configuration from environment
const projectId = import.meta.env.SANITY_PROJECT_ID || import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.SANITY_DATASET || import.meta.env.PUBLIC_SANITY_DATASET || 'production';

// Initialize the image URL builder
const builder = imageUrlBuilder({
    projectId,
    dataset
});

// Helper function to get URL builder for a source image
export function urlFor(source: SanityImageSource): ImageUrlBuilder {
    return builder.image(source);
}

// Generate a single optimized image URL
export function getImageUrl(
    source: SanityImageSource,
    width: number,
    options?: {
        height?: number;
        quality?: number;
        format?: 'auto' | 'webp' | 'jpg' | 'png';
    }
): string {
    let url = urlFor(source).width(width);
    
    if (options?.height) {
        url = url.height(options.height);
    }
    
    if (options?.format) {
        url = url.format(options.format === 'auto' ? 'webp' : options.format);
        url = url.auto('format');
    } else {
        url = url.auto('format');
    }
    
    if (options?.quality) {
        url = url.quality(options.quality);
    } else {
        url = url.quality(80);
    }
    
    return url.url();
}

// Generate srcset for responsive images
export function generateSrcSet(
    source: SanityImageSource,
    widths: number[] = [320, 480, 640, 768, 1024, 1200, 1920],
    options?: {
        quality?: number;
        format?: 'auto' | 'webp' | 'jpg' | 'png';
    }
): string {
    return widths
        .map(width => {
            const url = getImageUrl(source, width, options);
            return `${url} ${width}w`;
        })
        .join(', ');
}

// Generate sizes attribute for responsive images
export function generateSizes(
    breakpoints: { maxWidth?: number; minWidth?: number; size: string }[]
): string {
    return breakpoints
        .map(bp => {
            if (bp.maxWidth) {
                return `(max-width: ${bp.maxWidth}px) ${bp.size}`;
            } else if (bp.minWidth) {
                return `(min-width: ${bp.minWidth}px) ${bp.size}`;
            }
            return bp.size;
        })
        .join(', ');
}

// Default responsive sizes for common use cases
export const defaultSizes = {
    card: generateSizes([
        { maxWidth: 640, size: '100vw' },
        { maxWidth: 768, size: '50vw' },
        { maxWidth: 1024, size: '33vw' },
        { size: '25vw' }
    ]),
    hero: generateSizes([
        { maxWidth: 640, size: '100vw' },
        { size: '100vw' }
    ]),
    logo: generateSizes([
        { maxWidth: 640, size: '150px' },
        { size: '200px' }
    ]),
    avatar: generateSizes([
        { maxWidth: 640, size: '60px' },
        { size: '80px' }
    ])
};

// Check if source is a Sanity image reference
export function isSanityImage(source: any): boolean {
    return source && (
        source._type === 'image' ||
        source._type === 'reference' || // The source itself is a reference
        source._ref || // The source itself is an asset reference
        source.asset?._ref || // The source contains an asset reference
        source.asset?._id ||
        (typeof source === 'string' && source.includes('image-'))
    );
}