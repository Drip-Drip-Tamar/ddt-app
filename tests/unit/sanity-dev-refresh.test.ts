import { EventEmitter } from 'node:events';
import type * as SanityClientModule from '@sanity/client';
import type { AstroIntegration } from 'astro';
import { describe, expect, it, vi } from 'vitest';
import { createSanityDevRefreshIntegration } from '../../src/integrations/sanity-dev-refresh';

const createClient = vi.hoisted(() => vi.fn());

vi.mock('@sanity/client', async (importOriginal) => ({
    ...(await importOriginal<typeof SanityClientModule>()),
    createClient
}));

vi.mock('astro/config', () => ({
    defineConfig: vi.fn((config) => config)
}));

vi.mock('vite', () => ({
    loadEnv: vi.fn(() => ({
        SANITY_PROJECT_ID: 'test-project-id',
        SANITY_DATASET: 'test-dataset'
    }))
}));

vi.mock('@tailwindcss/vite', () => ({
    default: vi.fn(() => ({ name: 'tailwind' }))
}));

vi.mock('@sanity/astro', () => ({
    default: vi.fn(() => ({ name: 'sanity' }))
}));

vi.mock('@astrojs/netlify', () => ({
    default: vi.fn(() => ({ name: 'netlify-adapter' }))
}));

vi.mock('@astrojs/react', () => ({
    default: vi.fn(() => ({ name: 'react' }))
}));

describe('Sanity development refresh integration', () => {
    it('starts lazily, reloads on mutations, reports listener errors, and closes its subscription', () => {
        const subscription = { unsubscribe: vi.fn() };
        const observer = { next: vi.fn(), error: vi.fn() };
        const client = {
            listen: vi.fn(() => ({
                subscribe: vi.fn((nextObserver) => {
                    Object.assign(observer, nextObserver);
                    return subscription;
                })
            }))
        } as unknown as SanityClientModule.SanityClient;
        const server = {
            ws: { send: vi.fn() },
            httpServer: new EventEmitter()
        };
        const logger = { error: vi.fn() };
        const createClient = vi.fn(() => client);
        const integration = createSanityDevRefreshIntegration(createClient);

        expect(createClient).not.toHaveBeenCalled();
        expect(client.listen).not.toHaveBeenCalled();

        integration.hooks['astro:server:setup']?.({ server, logger } as never);

        expect(createClient).toHaveBeenCalledOnce();
        expect(client.listen).toHaveBeenCalledOnce();
        expect(client.listen).toHaveBeenCalledWith(
            '*[_type in ["page"]]',
            {},
            { visibility: 'query' }
        );

        observer.next({ type: 'mutation' });
        expect(server.ws.send).toHaveBeenCalledWith({ type: 'full-reload' });

        observer.error(new Error('Dataset not found'));
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Dataset not found')
        );

        server.httpServer.emit('close');
        expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    });

    it('omits the configured integration in test mode without creating a listener client', async () => {
        const listen = vi.fn(() => ({
            subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
        }));
        createClient.mockReturnValue({ listen } as unknown as SanityClientModule.SanityClient);

        expect(process.env.NODE_ENV).toBe('test');

        const config = (await import('../../astro.config.mjs')).default;
        const integration = config.integrations
            ?.flat()
            .find(
                (candidate): candidate is AstroIntegration =>
                    Boolean(
                        candidate &&
                            !Array.isArray(candidate) &&
                            candidate.name === 'sanity-dev-refresh'
                    )
            );

        integration?.hooks['astro:server:setup']?.({
            server: {
                ws: { send: vi.fn() },
                httpServer: new EventEmitter()
            },
            logger: { error: vi.fn() }
        } as never);

        expect(integration).toBeUndefined();
        expect(createClient).not.toHaveBeenCalled();
        expect(listen).not.toHaveBeenCalled();
    });
});
