import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, type SanityClient } from '@sanity/client';
import { buildSanityConfig, SANITY_API_VERSION } from './sanity-config';

export { SANITY_API_VERSION };

const envReaders = {
    SANITY_PROJECT_ID: () => import.meta.env.SANITY_PROJECT_ID ?? process.env.SANITY_PROJECT_ID,
    SANITY_DATASET: () => import.meta.env.SANITY_DATASET ?? process.env.SANITY_DATASET,
    SANITY_TOKEN: () => import.meta.env.SANITY_TOKEN ?? process.env.SANITY_TOKEN,
    SANITY_WRITE_TOKEN: () => import.meta.env.SANITY_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN,
    SANITY_STUDIO_URL: () => import.meta.env.SANITY_STUDIO_URL ?? process.env.SANITY_STUDIO_URL
} as const;

const readEnv = (name: keyof typeof envReaders): string | undefined => {
    const value = envReaders[name]();
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

export const getSanityReadToken = () => readEnv('SANITY_TOKEN');
export const getSanityWriteToken = () => readEnv('SANITY_WRITE_TOKEN');

export function createSanityReadClient({ preview }: { preview: boolean }): SanityClient {
    const token = getSanityReadToken();
    if (preview && !token) throw new Error('SANITY_TOKEN is required for preview');

    return createClient(
        buildSanityConfig({
            projectId: readEnv('SANITY_PROJECT_ID'),
            dataset: readEnv('SANITY_DATASET'),
            token,
            preview,
            studioUrl: readEnv('SANITY_STUDIO_URL') || '/studio'
        })
    );
}

export function createSanityWriteClient(): SanityClient {
    const token = getSanityWriteToken();
    if (!token) throw new Error('SANITY_WRITE_TOKEN is required');

    return createClient({
        ...buildSanityConfig({
            projectId: readEnv('SANITY_PROJECT_ID'),
            dataset: readEnv('SANITY_DATASET'),
            preview: false
        }),
        useCdn: false,
        token
    });
}

export const client = createSanityReadClient({ preview: false });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startDevContentListener(sanityClient: SanityClient = client) {
    sanityClient.listen('*[_type in ["page"]]', {}, { visibility: 'query' }).subscribe(async (event) => {
        if ('transition' in event && (event.transition === 'appear' || event.transition === 'disappear')) {
            const filePath = path.join(__dirname, '../layouts/Layout.astro');
            await fs.promises.utimes(filePath, new Date(), new Date());
        }
    });
}

if (import.meta.env.DEV) {
    startDevContentListener();
}
