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
        const pageErrors: string[] = [];
        const consoleErrors: string[] = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));
        page.on('console', (message) => {
            if (message.type() === 'error') consoleErrors.push(message.text());
        });

        const response = await page.goto('/results');
        expect(response?.ok()).toBeTruthy();

        // WaterQualityChart — built server-side from Sanity sample data, so
        // this exercises real (non-stubbed) content; requires SANITY_* env
        // vars to be set for the built Netlify runtime.
        const waterQualityCanvas = page.locator('canvas.water-chart');
        await expect(waterQualityCanvas).toBeVisible();

        // PollutionRiskForecast — DOM-only badges, no canvas, fed by the
        // stubbed /api/prf.json route.
        await expect(page.locator('[data-pollution-risk]')).toBeVisible();

        // TamarEnvironmentalMonitoring — four canvases (CSO, rainfall,
        // Gunnislake level, Plymouth level), fed by the stubbed routes above.
        const environmentalCanvases = page.locator('canvas.env-chart');
        await expect(environmentalCanvases).toHaveCount(4);
        // The environmental panel deliberately mounts all four charts only
        // when its observed Gunnislake canvas approaches the viewport.
        await environmentalCanvases.nth(2).scrollIntoViewIfNeeded();

        const canvases = [
            { name: 'water quality', locator: waterQualityCanvas },
            ...(await environmentalCanvases.all()).map((locator, index) => ({
                name: `environmental ${index + 1}`,
                locator
            }))
        ];

        for (const { name, locator } of canvases) {
            await test.step(`${name} canvas contains rendered pixels`, async () => {
                await expect
                    .poll(() =>
                        locator.evaluate((node: HTMLCanvasElement) => ({
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

                const rendering = await locator.evaluate((node: HTMLCanvasElement) => ({
                    width: node.width,
                    height: node.height
                }));
                expect(rendering.width).toBeGreaterThan(0);
                expect(rendering.height).toBeGreaterThan(0);
            });
        }

        expect(pageErrors).toEqual([]);
        expect(consoleErrors).toEqual([]);
    });
});
