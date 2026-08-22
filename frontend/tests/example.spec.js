// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Login & Core Application Load', () => {
  test('Verify Login Page elements and title', async ({ page }) => {
    // Open login page
    await page.goto('/login');

    // Verify page title / heading
    await expect(page).toHaveTitle(/HPMBS|Hospital/i);
    await expect(page.getByRole('heading', { name: /HPMBS Enterprise/i })).toBeVisible();
    await expect(page.getByText(/Enter your official hospital credentials/i)).toBeVisible();

    // Fill credentials
    await page.getByLabel(/Account Email \/ Phone \/ Login ID/i).fill('admin@citygeneral.com');
    await page.getByLabel('Password').fill('Password123!');

    // Verify Submit Button exists and is enabled
    const submitBtn = page.getByRole('button', { name: /Sign In as Staff \/ Admin/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });
});
