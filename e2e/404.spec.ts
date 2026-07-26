import { test, expect } from '@playwright/test';

for (const path of ['/this-page-does-not-exist', '/news/this-post-does-not-exist']) {
  test(`${path} returns a metadata-safe not-found response`, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
    await expect(page.locator('meta[property="twitter:url"]')).toHaveCount(0);
  });
}
