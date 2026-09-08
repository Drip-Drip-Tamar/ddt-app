import { test, expect } from '@playwright/test';

test('canonical metadata, sitemap and robots agree on public URLs', async ({ page, request }) => {
    await page.goto('/about?utm_source=community-review');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    const canonicalURL = new URL(canonical!);
    expect(canonicalURL.pathname).toBe('/about');
    expect(canonicalURL.search).toBe('');
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical!);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S.{20,}/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https?:\/\//);

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    expect(sitemap.headers()['content-type']).toContain('application/xml');
    const locations = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]));
    expect(locations.map((url) => url.pathname)).toEqual(expect.arrayContaining(['/', '/about', '/results', '/map', '/news', '/contact']));
    expect(locations.every((url) => url.origin === canonicalURL.origin && !url.search && !/^\/(api|studio|posts|404)(\/|$)/.test(url.pathname))).toBe(true);
    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    expect(await robots.text()).toContain(`Sitemap: ${canonicalURL.origin}/sitemap.xml`);
});

test('published articles expose matching structured metadata', async ({ page }) => {
    await page.goto('/news');
    const link = page.locator('a[href^="/news/"]').first();
    test.skip(await link.count() === 0, 'No published articles in this dataset.');
    await page.goto((await link.getAttribute('href'))!);
    const article = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(article['@type']).toBe('Article');
    expect(article.headline).toBe((await page.getByRole('heading', { level: 1 }).textContent())!.trim());
    expect(article.mainEntityOfPage).toBe(await page.locator('link[rel="canonical"]').getAttribute('href'));
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
});

test('home photography uses responsive sources and defers supporting backgrounds', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const background = page.locator('main section [aria-hidden="true"] img').first();
    test.skip(await background.count() === 0, 'No homepage background in this dataset.');
    await expect(background).toHaveAttribute('srcset', /480w/);
    await expect(background).toHaveAttribute('sizes', '100vw');
    await expect(background).toHaveAttribute('loading', 'lazy');
    await expect(background).toHaveAttribute('fetchpriority', 'auto');
    await background.scrollIntoViewIfNeeded();
    await expect.poll(() => background.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const selectedWidth = await background.evaluate((img: HTMLImageElement) => Number(new URL(img.currentSrc).searchParams.get('w')));
    expect(selectedWidth).toBeLessThan(1920);
    await expect(page.locator('header img')).toHaveAttribute('srcset', /64w/);
    await expect(page.locator('.card img').first()).toHaveAttribute('sizes', /calc\(100vw - 40px\)/);
});
