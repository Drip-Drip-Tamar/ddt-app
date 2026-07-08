import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sanity from '@sanity/astro';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import { sanityConfig } from './src/utils/sanity-client';

// https://astro.build/config
//
// output: 'server' is required, not incidental. The Sanity Presentation
// tool needs per-request rendering of Sanity-backed pages
// (previewDrafts perspective, stega-encoded fields)
// so editors see unpublished changes without a rebuild. A full static
// (`output: 'static'`) build was evaluated and rejected for this reason —
// see IMPROVEMENT-PLAN.md Task 17. Pages with no editable Sanity content
// (e.g. 404) opt back into prerendering individually via
// `export const prerender = true`, and SSR content pages set Cache-Control
// headers (outside preview mode) so Netlify's CDN can still edge-cache them.
export default defineConfig({
    output: 'server', // Enable server-side rendering
    adapter: netlify(),
    image: {
        domains: ['cdn.sanity.io']
    },
    integrations: [sanity(sanityConfig), react()],
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
