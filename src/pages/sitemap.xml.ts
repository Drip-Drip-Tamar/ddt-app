import type { APIRoute } from 'astro';
import { client } from '@utils/sanity-client';
import { canonicalUrl } from '@utils/canonical-url';

export const GET: APIRoute = async ({ site, url }) => {
    // Always use published content, including when an editor requests the sitemap.
    const documents = await client.fetch<{ _type: 'page' | 'post'; slug: string }[]>(
        '*[_type in ["page", "post"] && defined(slug.current)]{_type, "slug": slug.current}'
    );
    const paths = new Set(['/', '/news', '/results', '/map', '/contact']);
    for (const document of documents) {
        const slug = document.slug.split('/').filter(Boolean).map(encodeURIComponent).join('/');
        const path = document._type === 'post' ? `/news/${slug}` : `/${slug}`;
        if (!/^\/(api|studio|404|posts)(\/|$)/.test(path)) paths.add(path);
    }
    const entries = [...paths].map((path) => {
        const location = canonicalUrl(new URL(path, url), site).replace(/&/g, '&amp;');
        return `<url><loc>${location}</loc></url>`;
    }).join('');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600'
        }
    });
};
