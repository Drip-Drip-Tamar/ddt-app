import { test, expect } from '@playwright/test';

test.describe('home page', () => {
    test('renders title, header and footer', async ({ page }) => {
        const pageErrors: string[] = [];
        const consoleErrors: string[] = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));
        page.on('console', (message) => {
            if (message.type() === 'error') consoleErrors.push(message.text());
        });

        const response = await page.goto('/');
        expect(response?.ok()).toBeTruthy();

        await expect(page).toHaveTitle(/.+/);
        // Header.astro's root element is a <nav>, not a semantic <header>.
        await expect(page.locator('nav').first()).toBeVisible();
        await expect(page.locator('footer')).toBeVisible();
        expect(pageErrors).toEqual([]);
        expect(consoleErrors).toEqual([]);
    });

    test('built API responses include middleware security headers', async ({ request }) => {
        const response = await request.get('/api/disable-draft', {
            maxRedirects: 0
        });

        expect(response.status()).toBe(302);
        expect(response.headers()['content-security-policy']).toContain("default-src 'self'");
        expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
        expect(response.headers()['x-content-type-options']).toBe('nosniff');
    });
});
