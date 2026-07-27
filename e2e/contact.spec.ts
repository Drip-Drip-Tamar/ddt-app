import { test, expect } from '@playwright/test';

// This built-runtime smoke test is intentionally render-only. CI supplies the
// required server environment, but submitting would exercise a real Turnstile
// challenge and create a Sanity contact document. API integration tests cover
// the submission contract without those external side effects.
test.describe('contact page', () => {
    test('renders the contact form with all fields and the honeypot', async ({ page }) => {
        const response = await page.goto('/contact');
        expect(response?.ok()).toBeTruthy();

        const form = page.locator('#contactForm');
        await expect(form).toBeVisible();

        await expect(form.locator('#name')).toBeVisible();
        await expect(form.locator('#email')).toBeVisible();
        await expect(form.locator('#topic')).toBeVisible();
        await expect(form.locator('#message')).toBeVisible();
        await expect(form.locator('#consent')).toBeVisible();

        // Honeypot field: present in the DOM but hidden from real users.
        const honeypot = form.locator('input[name="_website"]');
        await expect(honeypot).toHaveCount(1);
        await expect(honeypot).toHaveAttribute('type', 'hidden');

        await expect(form.locator('button[type="submit"]')).toBeVisible();
    });
});
