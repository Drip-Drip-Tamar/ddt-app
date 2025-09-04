import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sanity from '@sanity/astro';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import { sanityConfig } from './src/utils/sanity-client';

// https://astro.build/config
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
