import { defineConfig, devices } from '@playwright/test';

// Thin smoke suite — see e2e/README notes in IMPROVEMENT-PLAN.md Task 15.
//
// webServer runs `astro dev`, not `astro preview`: the @astrojs/netlify
// adapter's SSR output does not support `astro preview` in Astro 6
// (confirmed locally — it throws "The @astrojs/netlify adapter does not
// support the preview command"). `astro dev` is an accurate enough stand-in
// for a smoke suite that only checks pages render and key elements appear.
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    timeout: 30_000,
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000
    }
});
