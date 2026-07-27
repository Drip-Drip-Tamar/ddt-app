import type { APIRoute } from 'astro';
import { validatePreviewUrl } from '@sanity/preview-url-secret';
import { createSanityReadClient, getSanityReadToken } from '@utils/sanity-client';

export const GET: APIRoute = async ({ request, session, redirect }) => {
    if (!getSanityReadToken()) {
        return new Response('Draft mode missing token', { status: 401 });
    }

    const result = await validatePreviewUrl(createSanityReadClient({ preview: true }), request.url);
    if (!result.isValid) {
        return new Response('Invalid preview secret', { status: 401 });
    }

    session?.set('sanityPreview', true, { ttl: 3600 });
    return redirect(result.redirectTo || '/', 302);
};
