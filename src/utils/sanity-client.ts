import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, type ClientConfig, type SanityClient } from '@sanity/client';
import { buildSanityConfig, resolveIsPreviewContext, SANITY_API_VERSION } from './sanity-config';

export { SANITY_API_VERSION };

// Env values come from import.meta.env in Vite-processed code (dev server,
// and statically replaced at build time in the SSR output) with a
// process.env fallback for plain-node contexts (vitest) and
// platform-injected runtime vars. Do NOT import vite's loadEnv here: this
// module is bundled into the Netlify SSR function, and vite pulls rollup's
// native binary into the runtime graph, which is absent in the function
// bundle and 502s every request.
const SANITY_PROJECT_ID = import.meta.env.SANITY_PROJECT_ID ?? process.env.SANITY_PROJECT_ID;
const SANITY_DATASET = import.meta.env.SANITY_DATASET ?? process.env.SANITY_DATASET;
const SANITY_TOKEN = import.meta.env.SANITY_TOKEN ?? process.env.SANITY_TOKEN;
const SANITY_WRITE_TOKEN = import.meta.env.SANITY_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
const SANITY_PREVIEW_DRAFTS = import.meta.env.SANITY_PREVIEW_DRAFTS ?? process.env.SANITY_PREVIEW_DRAFTS;

const isDev = import.meta.env.DEV;

/**
 * True in local dev, Netlify deploy previews, or when preview drafts are
 * explicitly requested. Used both to pick the read perspective/stega config
 * below and (from Layout.astro) to decide whether to render the visual
 * editing overlay at all, so production HTML never ships that island.
 */
export const isPreviewContext = resolveIsPreviewContext(isDev, SANITY_PREVIEW_DRAFTS);

// Shared read-only client config used for all page rendering/data fetching.
// SANITY_TOKEN should be rotated to a read-only token; write operations use
// createSanityWriteClient() below instead.
export const sanityConfig: ClientConfig = buildSanityConfig(
    {
        projectId: SANITY_PROJECT_ID,
        dataset: SANITY_DATASET,
        token: SANITY_TOKEN,
        previewDrafts: SANITY_PREVIEW_DRAFTS
    },
    isDev
);

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

    return createClient({ ...sanityConfig, token: writeToken });
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
