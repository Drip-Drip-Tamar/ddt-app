import { test, expect } from '@playwright/test';
import { csoLiveFixture, prfFixture, rainfallFixture, tamarLevelFixture } from './fixtures/api';

test.describe('results page', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/api/prf.json*', (route) => route.fulfill({ json: prfFixture }));
        await page.route('**/api/tamar-level.json*', (route) => route.fulfill({ json: tamarLevelFixture }));
        await page.route('**/api/rainfall.json*', (route) => route.fulfill({ json: rainfallFixture }));
        await page.route('**/api/cso-live.json*', (route) => route.fulfill({ json: csoLiveFixture }));
    });

    test('renders the water quality and environmental monitoring charts', async ({ page }) => {
        const response = await page.goto('/results');
        expect(response?.ok()).toBeTruthy();

        // WaterQualityChart — built server-side from Sanity sample data, so
        // this exercises real (non-stubbed) content; requires SANITY_* env
        // vars to be set for the dev server.
        await expect(page.locator('canvas.water-chart')).toBeVisible();

        // PollutionRiskForecast — DOM-only badges, no canvas, fed by the
        // stubbed /api/prf.json route.
        await expect(page.locator('[data-pollution-risk]')).toBeVisible();

        // TamarEnvironmentalMonitoring — four canvases (CSO, rainfall,
        // Gunnislake level, Plymouth level), fed by the stubbed routes above.
        await expect(page.locator('canvas.env-chart')).toHaveCount(4);
    });
});
