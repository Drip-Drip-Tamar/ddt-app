import { test, expect } from '@playwright/test';

test('does not publish canonical social URLs for a not-found response', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');

  expect(response?.status()).toBe(404);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
  await expect(page.locator('meta[property="twitter:url"]')).toHaveCount(0);
});
