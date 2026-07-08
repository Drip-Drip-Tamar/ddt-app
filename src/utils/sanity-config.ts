import type { ClientConfig } from '@sanity/client';

export const SANITY_API_VERSION = '2024-01-31';

export interface SanityEnvValues {
    projectId?: string;
    dataset?: string;
    token?: string;
    previewDrafts?: string;
}

/**
 * True in local dev, Netlify deploy previews, or when preview drafts are
 * explicitly requested. Used to pick the read perspective/stega config and
 * (from Layout.astro, via sanity-client) to decide whether to render the
 * visual editing overlay at all, so production HTML never ships that island.
 */
export function resolveIsPreviewContext(isDev: boolean, previewDrafts?: string): boolean {
    const isDeployPreview = process.env.CONTEXT === 'deploy-preview';
    return isDev || isDeployPreview || previewDrafts?.toLowerCase() === 'true';
}

/**
 * Pure builder for the shared Sanity client config. Kept free of any env
 * loading so it can be called both from astro.config.mjs (where vite's
 * loadEnv is safe — config files are never bundled into the server output)
 * and from sanity-client.ts (which must not touch vite: it is bundled into
 * the Netlify SSR function, and vite drags in rollup's native binary, which
 * is absent there and 502s every request).
 */
export function buildSanityConfig(env: SanityEnvValues, isDev: boolean): ClientConfig {
    const isPreviewContext = resolveIsPreviewContext(isDev, env.previewDrafts);

    return {
        projectId: env.projectId,
        dataset: env.dataset || 'production',
        useCdn: false,
        apiVersion: SANITY_API_VERSION,
        perspective: isPreviewContext ? 'previewDrafts' : 'published',
        // Enable stega encoding for visual editing when in preview mode
        stega: isPreviewContext
            ? {
                  enabled: true,
                  studioUrl: isDev ? 'http://localhost:3333' : '/studio'
              }
            : undefined,
        token: env.token
    };
}
