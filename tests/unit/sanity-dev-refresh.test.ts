import { EventEmitter } from 'node:events';
import type { SanityClient } from '@sanity/client';
import { describe, expect, it, vi } from 'vitest';
import { createSanityDevRefreshIntegration } from '../../src/integrations/sanity-dev-refresh';

describe('Sanity development refresh integration', () => {
    it('reloads on mutations, reports listener errors, and closes its subscription', () => {
        const subscription = { unsubscribe: vi.fn() };
        const observer = { next: vi.fn(), error: vi.fn() };
        const client = {
            listen: vi.fn(() => ({
                subscribe: vi.fn((nextObserver) => {
                    Object.assign(observer, nextObserver);
                    return subscription;
                })
            }))
        } as unknown as SanityClient;
        const server = {
            ws: { send: vi.fn() },
            httpServer: new EventEmitter()
        };
        const logger = { error: vi.fn() };
        const integration = createSanityDevRefreshIntegration(() => client);

        integration.hooks['astro:server:setup']?.({ server, logger } as never);

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
});
