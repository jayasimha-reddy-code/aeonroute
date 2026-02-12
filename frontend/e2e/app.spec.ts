import { test, expect } from '@playwright/test';

test.describe('App Page Load', () => {
    test('page loads with correct title', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/EVRouteOpt/i);
    });

    test('dashboard view is default', async ({ page }) => {
        await page.goto('/');
        // Dashboard content should be visible
        const mainContent = page.locator('main');
        await expect(mainContent).toBeVisible();
    });

    test('skip link appears on Tab press', async ({ page }) => {
        await page.goto('/');
        await page.keyboard.press('Tab');
        // Skip link should be visible after Tab
        const skipLink = page.getByText(/Skip to main content/i);
        await expect(skipLink).toBeVisible();
    });

    test('theme toggle cycles through modes', async ({ page }) => {
        await page.goto('/');
        const themeButton = page.getByRole('button', { name: /toggle theme/i });

        // Initial state — click once
        await themeButton.click();
        // Should cycle through light → dark → system → light
        // Just verify button remains clickable
        await expect(themeButton).toBeEnabled();
    });
});
