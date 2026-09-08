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
        await stormOverflowCanvas.locator("..").scrollIntoViewIfNeeded();
        await expect(stormOverflowCanvas).toBeVisible();

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

    test('stacks the live-status badge below the map heading on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.unroute('**/api/cso.json*');
        await page.route('**/api/cso.json*', (route) =>
            route.fulfill({
                json: {
                    ...csoMapFixture,
                    activeCount: 0,
                    recentCount: 5
                }
            })
        );

        await page.goto('/map');

        const heading = page.getByRole('heading', { name: 'Storm Overflow Locations' });
        const headingCopy = heading.locator('..');
        const statusBadge = page.locator('[id^="cso-map-"][id$="-status"]');
        await expect(statusBadge).toHaveText('5 Recent');
        await expect(statusBadge).toHaveCSS('white-space', 'nowrap');
        await expect(statusBadge).toHaveCSS('flex-shrink', '0');

        const headingCopyBox = await headingCopy.boundingBox();
        const statusBadgeBox = await statusBadge.boundingBox();

        expect(headingCopyBox).not.toBeNull();
        expect(statusBadgeBox).not.toBeNull();
        expect(statusBadgeBox!.y).toBeGreaterThanOrEqual(headingCopyBox!.y + headingCopyBox!.height);
    });

    test('gives each storm-overflow marker an accessible name', async ({ page }) => {
        await page.goto('/map');

        await expect(page.getByRole('button', { name: 'Calstock CSO', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Gunnislake CSO', exact: true })).toBeVisible();
    });
});

for (const fails of [false, true]) {
    test(`map skeleton settles after a ${fails ? 'failed' : 'delayed'} response without resizing`, async ({ page }) => {
        let release!: () => void;
        const pending = new Promise<void>((resolve) => { release = resolve; });
        await page.route('**/api/cso-live.json*', (route) => route.fulfill({ json: csoLiveFixture }));
        await page.route('**/api/cso.json*', async (route) => {
            await pending;
            await route.fulfill(fails ? { status: 503 } : { json: csoMapFixture });
        });
        try {
            await page.goto('/map');
            const frame = page.locator('.map-frame');
            await frame.scrollIntoViewIfNeeded();
            await expect(frame).toHaveAttribute('aria-busy', 'true');
            await expect(frame.getByRole('status')).toHaveText('Loading map and overflow locations…');
            const before = await frame.boundingBox();
            release();
            await expect(frame).toHaveAttribute('aria-busy', 'false');
            expect((await frame.boundingBox())!.height).toBe(before!.height);
            if (fails) {
                await expect(frame.getByRole('status')).toContainText('Map unavailable');
                await expect(page.locator('[id$="-status"]')).toHaveText('Unavailable');
                await expect(page.getByRole('alert')).toContainText('CSO data unavailable');
            } else {
                await expect(frame.getByRole('status')).toHaveCount(0);
                await expect(page.getByRole('button', { name: 'Calstock CSO', exact: true })).toBeVisible();
            }
        } finally {
            release();
        }
    });
}
