import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import sanity from '@sanity/astro';
import { createClient } from '@sanity/client';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import { createSanityDevRefreshIntegration } from './src/integrations/sanity-dev-refresh';
import { buildSanityConfig } from './src/utils/sanity-config';

// loadEnv is safe here (config files are build-time only, never bundled into
// the server output) but must not be used from src/ — see sanity-config.ts.
const env = loadEnv(process.env.NODE_ENV || '', process.cwd(), '');
const sanityConfig = buildSanityConfig(
    {
        projectId: env.SANITY_PROJECT_ID,
        dataset: env.SANITY_DATASET,
        token: env.SANITY_TOKEN,
        preview: false,
        studioUrl: env.SANITY_STUDIO_URL || '/studio'
    }
);

// https://astro.build/config
//
// output: 'server' is required, not incidental. The Sanity Presentation
// tool needs per-request rendering of Sanity-backed pages
// (draft perspective, stega-encoded fields)
// so editors see unpublished changes without a rebuild. A full static
// (`output: 'static'`) build was evaluated and rejected for this reason —
// see IMPROVEMENT-PLAN.md Task 17. Independent pages may opt back into
// prerendering individually, while /404 intentionally remains on demand so
// dynamic routes can rewrite to it with the correct status in Netlify's built
// runtime. SSR content pages set Cache-Control headers (outside preview mode)
// so Netlify's CDN can still edge-cache them.
export default defineConfig({
    output: 'server', // Enable server-side rendering
    adapter: netlify(),
    session: {
        cookie: {
            name: 'ddt-preview',
            sameSite: 'lax',
            secure: true
        },
        ttl: 3600
    },
    image: {
        domains: ['cdn.sanity.io']
    },
    integrations: [
        sanity(sanityConfig),
        react(),
        createSanityDevRefreshIntegration(() => createClient({ ...sanityConfig, useCdn: false }))
    ],
    vite: {
        plugins: [tailwindcss()],
        server: {
            hmr: { path: '/vite-hmr/' },
            allowedHosts: ['.netlify.app']
        }
    },
    server: {
        port: 3000
    }
});
