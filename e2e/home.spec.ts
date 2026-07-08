import { test, expect } from '@playwright/test';

test.describe('home page', () => {
    test('renders title, header and footer', async ({ page }) => {
        const response = await page.goto('/');
        expect(response?.ok()).toBeTruthy();

        await expect(page).toHaveTitle(/.+/);
        // Header.astro's root element is a <nav>, not a semantic <header>.
        await expect(page.locator('nav').first()).toBeVisible();
        await expect(page.locator('footer')).toBeVisible();
    });
});
