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

    test('styles Portable Text blocks as article typography', async ({ page }) => {
        const response = await page.goto('/news');
        expect(response?.ok()).toBeTruthy();

        const styles = await page.evaluate(() => {
            const fixture = document.createElement('div');
            fixture.className =
                'prose mx-auto prose-headings:font-bold prose-a:text-primary prose-img:rounded-lg';
            fixture.innerHTML = `
                <div class="portable-text">
                    <p data-testid="body-copy">Body copy</p>
                    <h2 data-testid="heading-two">What happened in 2025?</h2>
                    <h3 data-testid="heading-three">More detail</h3>
                    <blockquote data-testid="quote">Quoted text</blockquote>
                    <ul><li data-testid="list-item">List item</li></ul>
                    <p><strong data-testid="bold-copy">Bold copy</strong></p>
                </div>
            `;
            document.body.append(fixture);

            const readStyles = (selector: string) => {
                const element = fixture.querySelector<HTMLElement>(selector);
                if (!element) throw new Error(`Missing typography fixture element: ${selector}`);

                const computed = getComputedStyle(element);
                return {
                    fontSize: Number.parseFloat(computed.fontSize),
                    lineHeight: Number.parseFloat(computed.lineHeight),
                    fontWeight: Number.parseInt(computed.fontWeight, 10),
                    marginBottom: Number.parseFloat(computed.marginBottom),
                    borderLeftWidth: Number.parseFloat(computed.borderLeftWidth),
                    fontStyle: computed.fontStyle
                };
            };

            const result = {
                paragraph: readStyles('[data-testid="body-copy"]'),
                headingTwo: readStyles('[data-testid="heading-two"]'),
                headingThree: readStyles('[data-testid="heading-three"]'),
                quote: readStyles('[data-testid="quote"]'),
                listItem: readStyles('[data-testid="list-item"]'),
                articleWidth: fixture.getBoundingClientRect().width,
                bold: readStyles('[data-testid="bold-copy"]')
            };

            fixture.remove();
            return result;
        });

        expect(styles.headingTwo.fontSize).toBeGreaterThan(styles.paragraph.fontSize);
        expect(styles.headingThree.fontSize).toBeGreaterThan(styles.paragraph.fontSize);
        expect(styles.headingTwo.fontWeight).toBeGreaterThan(styles.paragraph.fontWeight);
        expect(styles.paragraph.marginBottom).toBeGreaterThan(0);
        expect(styles.paragraph.marginBottom).toBeLessThanOrEqual(20);
        expect(styles.paragraph.lineHeight / styles.paragraph.fontSize).toBeLessThanOrEqual(1.75);
        expect(styles.listItem.marginBottom).toBeLessThanOrEqual(8);
        expect(styles.articleWidth).toBeLessThanOrEqual(720);
        expect(styles.quote.borderLeftWidth).toBeGreaterThan(0);
        expect(styles.quote.fontStyle).toBe('italic');
        expect(styles.bold.fontWeight).toBeGreaterThan(styles.paragraph.fontWeight);
    });
});
