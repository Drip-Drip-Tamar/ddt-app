import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from 'vite';
import { createClient, type ClientConfig, type SanityClient } from '@sanity/client';

const {
    SANITY_PROJECT_ID,
    SANITY_DATASET,
    SANITY_TOKEN,
    SANITY_WRITE_TOKEN,
    STACKBIT_PREVIEW,
    SANITY_PREVIEW_DRAFTS
} = loadEnv(process.env.NODE_ENV || '', process.cwd(), '');

const isDev = import.meta.env.DEV;
const isDeployPreview = process.env.CONTEXT === 'deploy-preview';
const previewDrafts = STACKBIT_PREVIEW?.toLowerCase() === 'true' || SANITY_PREVIEW_DRAFTS?.toLowerCase() === 'true';

/**
 * True in local dev, Netlify deploy previews, or when preview drafts are
 * explicitly requested. Used both to pick the read perspective/stega config
 * below and (from Layout.astro) to decide whether to render the visual
 * editing overlay at all, so production HTML never ships that island.
 */
export const isPreviewContext = isDev || isDeployPreview || previewDrafts;

export const SANITY_API_VERSION = '2024-01-31';

const baseConfig: Omit<ClientConfig, 'token'> = {
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET || 'production',
    useCdn: false,
    apiVersion: SANITY_API_VERSION,
    perspective: isPreviewContext ? 'previewDrafts' : 'published',
    // Enable stega encoding for visual editing when in preview mode
    stega: isPreviewContext
        ? {
              enabled: true,
              studioUrl: isDev ? 'http://localhost:3333' : '/studio'
          }
        : undefined
};

// Shared read-only client config used for all page rendering/data fetching.
// SANITY_TOKEN should be rotated to a read-only token; write operations use
// createSanityWriteClient() below instead.
export const sanityConfig: ClientConfig = { ...baseConfig, token: SANITY_TOKEN };

export const client = createClient(sanityConfig);

let warnedAboutWriteTokenFallback = false;

/**
 * Creates a write-capable Sanity client for endpoints that mutate content
 * (e.g. the contact form). Prefers a dedicated SANITY_WRITE_TOKEN; falls
 * back to SANITY_TOKEN with a one-time warning until that token exists.
 */
export function createSanityWriteClient(): SanityClient {
    const writeToken = SANITY_WRITE_TOKEN ?? SANITY_TOKEN;

    if (!SANITY_WRITE_TOKEN && !warnedAboutWriteTokenFallback) {
        warnedAboutWriteTokenFallback = true;
        console.warn(
            'SANITY_WRITE_TOKEN is not set; falling back to SANITY_TOKEN for write operations. ' +
                'Create a dedicated write-capable token and set SANITY_WRITE_TOKEN so SANITY_TOKEN can be rotated to read-only.'
        );
    }

    return createClient({ ...baseConfig, token: writeToken });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Subscribes to Sanity page create/delete events and touches Layout.astro's
 * mtime to force Astro's dev server to refresh getStaticPaths. Opens a
 * websocket and writes to the source tree at runtime, so this must only ever
 * run in local dev — never as a side effect of importing this module in SSR.
 *
 * @param sanityClient The Sanity client to add the listener to
 */
export function startDevContentListener(sanityClient: SanityClient = client) {
    sanityClient.listen('*[_type in ["page"]]', {}, { visibility: 'query' }).subscribe(async (event) => {
        // only refresh when pages are deleted or created
        if ('transition' in event && (event.transition === 'appear' || event.transition === 'disappear')) {
            const filePath = path.join(__dirname, '../layouts/Layout.astro');
            const time = new Date();

            // update the updatedat stamp for the layout file, triggering astro to refresh the data in getStaticPaths
            await fs.promises.utimes(filePath, time, time);
        }
    });
}

// No clean dev-only call site exists for this (it's a module imported by
// both server and client code paths), so the side effect is gated strictly
// behind import.meta.env.DEV here instead of running unconditionally at
// module scope.
if (import.meta.env.DEV) {
    startDevContentListener();
}
