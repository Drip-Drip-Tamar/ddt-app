import type { APIContext } from 'astro';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('disable draft preview endpoint', () => {
    const values = new Map<string, unknown>();
    const session = {
        get: vi.fn((key: string) => Promise.resolve(values.get(key))),
        set: vi.fn((key: string, value: unknown) => values.set(key, value)),
        destroy: vi.fn(() => values.clear())
    };

    beforeEach(() => {
        values.set('sanityPreview', true);
        vi.clearAllMocks();
    });

    it('destroys the preview session and redirects home', async () => {
        const { GET } = await import('@pages/api/disable-draft');
        const context = {
            session,
            redirect: (location: string, status = 302) => new Response(null, { status, headers: { location } })
        } as unknown as APIContext;

        const response = await GET(context);

        expect(session.destroy).toHaveBeenCalledOnce();
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('/');
    });
});
