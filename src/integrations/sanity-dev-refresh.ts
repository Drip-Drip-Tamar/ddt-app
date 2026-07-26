import type { SanityClient } from '@sanity/client';
import type { AstroIntegration } from 'astro';

export function createSanityDevRefreshIntegration(
    createClient: () => Pick<SanityClient, 'listen'>
): AstroIntegration {
    return {
        name: 'sanity-dev-refresh',
        hooks: {
            'astro:server:setup': ({ server, logger }) => {
                const client = createClient();
                const subscription = client
                    .listen.call(client as SanityClient, '*[_type in ["page"]]', {}, { visibility: 'query' })
                    .subscribe({
                        next: () => server.ws.send({ type: 'full-reload' }),
                        error: (error) =>
                            logger.error(`Sanity dev refresh listener failed: ${String(error)}`)
                    });

                server.httpServer?.once('close', () => subscription.unsubscribe());
            }
        }
    };
}
