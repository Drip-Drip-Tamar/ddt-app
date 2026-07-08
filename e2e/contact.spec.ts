import { test, expect } from '@playwright/test';

// Turnstile happy-path submission is not automated here: the .env this repo
// runs the dev server with contains live production Turnstile keys (not
// Cloudflare's published always-pass test keys), so a real submission would
// either hit Cloudflare's real challenge (unautomatable headlessly) or
// require overriding PUBLIC_TURNSTILE_SITE_KEY/TURNSTILE_SECRET_KEY with
// Cloudflare's test keys for this run only, which the repo's env wiring
// (.env locally, Netlify/GitHub secrets in CI) does not currently support
// per-job. Per Task 15's fallback, this smoke test instead asserts the form
// renders with every required field plus the honeypot.
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
