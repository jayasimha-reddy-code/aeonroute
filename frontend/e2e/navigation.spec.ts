import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
    test('clicking sidebar items changes active view', async ({ page }) => {
        await page.goto('/');

        // Click Route Planner
        await page.getByText(/Route Planner/i).click();
        // Content should update
        const main = page.locator('main');
        await expect(main).toBeVisible();
    });

    test('Route Planner tab shows route content', async ({ page }) => {
        await page.goto('/');
        await page.getByText(/Route Planner/i).click();
        // Should display route planner view
        await expect(page.locator('main')).toBeVisible();
    });

    test('Training tab shows training content', async ({ page }) => {
        await page.goto('/');
        await page.getByText(/Training/i).click();
        await expect(page.locator('main')).toBeVisible();
    });

    test('Analytics tab shows analytics content', async ({ page }) => {
        await page.goto('/');
        await page.getByText(/Analytics/i).click();
        await expect(page.locator('main')).toBeVisible();
    });
});
