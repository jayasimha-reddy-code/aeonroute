import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for key pages.
 *
 * Each test navigates to a page, waits for content to settle,
 * then captures a full-page screenshot for comparison.
 *
 * Run with:  npm run test:e2e
 * Update baselines:  npm run test:e2e:update
 */

/** Helper: wait for network idle + animations to settle */
async function waitForPageReady(page: import('@playwright/test').Page) {
    // Wait for network to be idle (no requests for 500ms)
    await page.waitForLoadState('networkidle').catch(() => {});
    // Wait a bit more for CSS transitions / framer-motion animations
    await page.waitForTimeout(800);
}

test.describe('Visual Regression - Dashboard', () => {
    test('dashboard default view', async ({ page }) => {
        await page.goto('/');
        await waitForPageReady(page);

        await expect(page).toHaveScreenshot('dashboard-default.png', {
            fullPage: true,
        });
    });

    test('dashboard dark mode', async ({ page }) => {
        await page.goto('/');
        await waitForPageReady(page);

        // Click the theme toggle to switch to dark mode
        // Theme cycle: light -> dark -> system -> light
        // Force dark by toggling until <html> has class "dark".
        const html = page.locator('html');
        const themeButton = page.getByRole('button', { name: /theme/i });

        for (let i = 0; i < 3; i++) {
            const isDark = await html.evaluate((el) => el.classList.contains('dark'));
            if (isDark) break;
            await themeButton.click();
            await page.waitForTimeout(300);
        }

        await waitForPageReady(page);

        await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
            fullPage: true,
        });
    });
});

test.describe('Visual Regression - Route Planner', () => {
    test('route planner page', async ({ page }) => {
        await page.goto('/');
        await waitForPageReady(page);

        // Navigate to Route Planner via sidebar
        await page.getByText(/Route Planner/i).click();
        await waitForPageReady(page);

        await expect(page).toHaveScreenshot('route-planner.png', {
            fullPage: true,
        });
    });
});

test.describe('Visual Regression - Training', () => {
    test('training page', async ({ page }) => {
        await page.goto('/');
        await waitForPageReady(page);

        // Navigate to Training via sidebar
        await page.getByRole('button', { name: /Training/i }).click();
        await waitForPageReady(page);

        await expect(page).toHaveScreenshot('training-page.png', {
            fullPage: true,
        });
    });
});

test.describe('Visual Regression - Analytics', () => {
    test('analytics page', async ({ page }) => {
        await page.goto('/');
        await waitForPageReady(page);

        // Navigate to Analytics via sidebar
        await page.getByText(/Analytics/i).click();
        await waitForPageReady(page);

        await expect(page).toHaveScreenshot('analytics-page.png', {
            fullPage: true,
        });
    });
});
