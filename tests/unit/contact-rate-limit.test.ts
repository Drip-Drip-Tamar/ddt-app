import { describe, expect, it } from 'vitest';

import handler, { config } from '../../netlify/edge-functions/contact-rate-limit';

describe('contact form edge rate limit', () => {
  it('targets the contact API with a balanced per-IP throttle', () => {
    expect(config).toEqual({
      path: '/api/contact',
      rateLimit: {
        windowLimit: 5,
        windowSize: 60,
        aggregateBy: ['ip', 'domain']
      }
    });
  });

  it('passes allowed requests through to the Astro contact endpoint', async () => {
    const response = new Response('continued', { status: 202 });
    const context = {
      next: () => Promise.resolve(response)
    };

    await expect(handler(new Request('http://localhost/api/contact'), context)).resolves.toBe(response);
  });
});
