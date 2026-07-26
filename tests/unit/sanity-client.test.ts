import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('sanity-client', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubEnv('SANITY_PROJECT_ID', 'test-project-id');
        vi.stubEnv('SANITY_DATASET', 'test-dataset');
        vi.stubEnv('SANITY_TOKEN', 'read-token');
        vi.stubEnv('SANITY_WRITE_TOKEN', '');
        vi.stubEnv('SANITY_STUDIO_URL', 'https://studio.example.test');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('creates a published read client without a read token or stega', async () => {
        const { createSanityReadClient } = await import('@utils/sanity-client');

        const config = createSanityReadClient({ preview: false }).config();

        expect(config).toMatchObject({
            perspective: 'published',
            useCdn: true
        });
        expect(config.stega?.enabled).toBe(false);
        expect(config.token).toBeUndefined();
    });

    it('creates a draft read client with the read token and stega', async () => {
        const { createSanityReadClient } = await import('@utils/sanity-client');

        const config = createSanityReadClient({ preview: true }).config();

        expect(config).toMatchObject({
            perspective: 'drafts',
            useCdn: false,
            token: 'read-token'
        });
        expect(config.stega?.enabled).toBe(true);
    });

    it('trims configured read and write tokens', async () => {
        vi.stubEnv('SANITY_TOKEN', '  read-token  ');
        vi.stubEnv('SANITY_WRITE_TOKEN', '  write-token  ');
        const { getSanityReadToken, getSanityWriteToken } = await import('@utils/sanity-client');

        expect(getSanityReadToken()).toBe('read-token');
        expect(getSanityWriteToken()).toBe('write-token');
    });

    it('requires a dedicated write token instead of falling back to the read token', async () => {
        const { createSanityWriteClient } = await import('@utils/sanity-client');

        expect(() => createSanityWriteClient()).toThrow('SANITY_WRITE_TOKEN is required');
    });
});
