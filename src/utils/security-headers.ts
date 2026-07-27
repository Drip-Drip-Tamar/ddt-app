export const SECURITY_HEADERS = {
    'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'self' https://*.sanity.studio http://localhost:3333; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https://cdn.sanity.io https://*.tile.openstreetmap.org; connect-src 'self' https://*.api.sanity.io wss://*.api.sanity.io; frame-src https://challenges.cloudflare.com",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff'
} as const;
