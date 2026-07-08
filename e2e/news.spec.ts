import { test, expect } from '@playwright/test';

// This page fetches live Sanity content server-side (`POSTS_QUERY`), so it
// cannot be stubbed from the browser like the /api/*.json routes — there is
// no client-side fetch to intercept. The suite therefore only asserts the
// page returns 200 and the page shell renders correctly; it does NOT assert
// on specific post content, which depends on whatever is published in the
// SANITY_DATASET the test run points at (local .env locally, repository
// secrets in CI). If that dataset has zero published posts, the "empty
// state" copy renders instead of a list — both are valid page shells, so
// this test accepts either.
test.describe('news page', () => {
    test('returns 200 and renders the page shell', async ({ page }) => {
        const response = await page.goto('/news');
        expect(response?.ok()).toBeTruthy();

        await expect(page.getByRole('heading', { name: 'News', level: 1 })).toBeVisible();

        const hasPosts = await page.locator('article, li, [class*="post"]').count();
        const hasEmptyState = await page.getByText('No news posts available yet.').count();
        expect(hasPosts > 0 || hasEmptyState > 0).toBeTruthy();
    });
});
