import { test, expect } from '@playwright/test';
import { csoLiveFixture, csoMapFixture } from './fixtures/api';

test.describe('storm overflow map page', () => {
    test.beforeEach(async ({ page }) => {
        // Stub the EA/SWW-backed API routes so the suite never depends on
        // live upstream availability (see IMPROVEMENT-PLAN.md Task 15).
        await page.route('**/api/cso.json*', (route) =>
            route.fulfill({ json: csoMapFixture })
        );
        await page.route('**/api/cso-live.json*', (route) =>
            route.fulfill({ json: csoLiveFixture })
        );
    });

    test('shows the leaflet map container and the CSO activity panel', async ({ page }) => {
        await page.goto('/map');

        // Leaflet initializes the map container with its own class.
        await expect(page.locator('.cso-leaflet-map')).toBeVisible();
        await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 });

        // CSO activity chart panel (TamarStormOverflow), fed by the stubbed
        // /api/cso-live.json route.
        await expect(page.locator('[data-storm-overflow]')).toBeVisible();
        await expect(page.locator('[data-storm-overflow] canvas')).toBeVisible();
    });
});
