import type { SanityClient } from '@sanity/client';
import type { AstroIntegration } from 'astro';

export function createSanityDevRefreshIntegration(
    createClient: () => SanityClient
): AstroIntegration {
    return {
        name: 'sanity-dev-refresh',
        hooks: {
            'astro:server:setup': ({ server, logger }) => {
                const client = createClient();
                const subscription = client
                    .listen('*[_type in ["page"]]', {}, { visibility: 'query' })
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
