// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Login & Core Application Load', () => {
  test('Verify Login Page elements and title', async ({ page }) => {
    // Open login page
    await page.goto('/login');

    // Verify page title / heading
    await expect(page).toHaveTitle(/HPMBS|Hospital/i);
    await expect(page.getByRole('heading', { name: /HPMBS Enterprise/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Sign in to your workstation/i })).toBeVisible();

    // Fill credentials
    await page.locator('input[placeholder*="email"]').fill('admin@citygeneral.com');
    await page.locator('input[type="password"]').fill('1234');

    // Verify Submit Button exists and is enabled
    const submitBtn = page.getByRole('button', { name: /Sign In to Workstation/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });
});