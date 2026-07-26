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

    test('shows the leaflet map container and renders the CSO activity chart', async ({ page }) => {
        const pageErrors: string[] = [];
        const consoleErrors: string[] = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));
        page.on('console', (message) => {
            if (message.type() === 'error') consoleErrors.push(message.text());
        });

        const response = await page.goto('/map');
        expect(response?.ok()).toBeTruthy();

        // Leaflet initializes the map container with its own class.
        await expect(page.locator('.cso-leaflet-map')).toBeVisible();
        await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 });

        // CSO activity chart panel (TamarStormOverflow), fed by the stubbed
        // /api/cso-live.json route.
        await expect(page.locator('[data-storm-overflow]')).toBeVisible();
        const stormOverflowCanvas = page.locator('[data-storm-overflow] canvas');
        await expect(stormOverflowCanvas).toBeVisible();
        await stormOverflowCanvas.scrollIntoViewIfNeeded();

        await expect
            .poll(() =>
                stormOverflowCanvas.evaluate((node: HTMLCanvasElement) => ({
                    width: node.width,
                    height: node.height,
                    hasInk: Array.from(node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data).some(
                        (channel, index) => index % 4 !== 3 && channel !== 0
                    )
                }))
            )
            .toMatchObject({
                width: expect.any(Number),
                height: expect.any(Number),
                hasInk: true
            });

        const rendering = await stormOverflowCanvas.evaluate((node: HTMLCanvasElement) => ({
            width: node.width,
            height: node.height
        }));
        expect(rendering.width).toBeGreaterThan(0);
        expect(rendering.height).toBeGreaterThan(0);
        expect(pageErrors).toEqual([]);
        expect(consoleErrors).toEqual([]);
    });
});
