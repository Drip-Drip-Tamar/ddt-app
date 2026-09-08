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
        await expect(form.getByRole('link', { name: 'How we use your message' })).toHaveAttribute('href', '#contact-privacy');
        await expect(page.locator('#contact-privacy')).toContainText('only to respond to your enquiry');
        const contrast = await form.getByRole('link', { name: 'How we use your message' }).evaluate((link) => {
            const channels = getComputedStyle(link).color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
            const linear = channels.map((channel) => {
                const value = channel / 255;
                return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            });
            const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
            return 1.05 / (luminance + 0.05); // Contact copy is on a white background.
        });
        expect(contrast).toBeGreaterThanOrEqual(4.5);
    });
});
