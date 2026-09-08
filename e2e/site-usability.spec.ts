import { test, expect } from '@playwright/test';
import { csoLiveFixture, csoMapFixture, prfFixture, rainfallFixture, tamarLevelFixture } from './fixtures/api';

test('shared layout stays readable and navigable on phones and desktop', async ({ page }) => {
    test.setTimeout(120_000);
    for (const [path, json] of Object.entries({
        'cso.json': csoLiveFixture,
        'cso-live.json': csoLiveFixture,
        'cso-map.json': csoMapFixture,
        'prf.json': prfFixture,
        'rainfall.json': rainfallFixture,
        'tamar-level.json': tamarLevelFixture
    })) {
        await page.route(`**/api/${path}*`, (route) => route.fulfill({ json }));
    }

    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        for (const path of ['/', '/about', '/your-voice', '/results', '/map', '/news', '/contact']) {
            await test.step(`${path} at ${width}px`, async () => {
                expect((await page.goto(path))?.ok()).toBeTruthy();
                await expect(page.getByRole('main')).toHaveCount(1);
                await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
                await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
                expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

                const logo = page.locator('header nav img');
                await expect(logo).toHaveAttribute('loading', 'eager');
                const currentLink = page.locator(`nav a[aria-current="page"][href="${path}"]`).filter({ visible: true });
                if (width < 1024) {
                    const toggle = page.getByRole('button', { name: 'Open Menu' });
                    await toggle.click();
                    await expect(currentLink).toBeVisible();
                    await expect(page.locator('#nav-panel a').first()).toBeFocused();
                    for (const link of await page.locator('#nav-panel a').all()) {
                        await expect.poll(async () => (await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
                    }
                    await page.keyboard.press('Escape');
                    await expect(toggle).toBeFocused();
                    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
                } else {
                    await expect(currentLink).toBeVisible();
                }
            });
        }
    }

    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();

    await page.goto('/results');
    await expect(page.locator('[data-water-quality] time')).toHaveAttribute('datetime', /\d{4}-\d{2}-\d{2}/);
    await expect(page.getByRole('region', { name: 'Recent test results' })).toHaveCount(0);
    await page.getByRole('button', { name: 'View data table' }).click();
    await expect(page.getByRole('region', { name: 'Recent test results' })).toBeVisible();
    await page.getByRole('button', { name: 'Hide data table' }).click();
    await expect(page.getByRole('region', { name: 'Recent test results' })).toHaveCount(0);
    const list = page.locator('.markdown ul').first();
    await expect(list).toHaveCSS('list-style-type', 'disc');
    expect(await list.evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft))).toBeGreaterThan(0);
});
