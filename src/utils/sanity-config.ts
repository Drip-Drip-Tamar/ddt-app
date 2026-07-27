import type { ClientConfig } from '@sanity/client';

export const SANITY_API_VERSION = '2024-01-31';

export interface SanityConfigOptions {
    projectId?: string;
    dataset?: string;
    token?: string;
    preview: boolean;
    studioUrl?: string;
}

/** Pure builder for request-scoped Sanity read client configuration. */
export function buildSanityConfig(options: SanityConfigOptions): ClientConfig {
    return {
        projectId: options.projectId,
        dataset: options.dataset || 'production',
        apiVersion: SANITY_API_VERSION,
        perspective: options.preview ? 'drafts' : 'published',
        useCdn: !options.preview,
        token: options.preview ? options.token : undefined,
        stega: {
            enabled: options.preview,
            studioUrl: options.studioUrl
        }
    };
}
