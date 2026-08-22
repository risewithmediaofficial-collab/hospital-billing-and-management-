import { test, expect } from '@playwright/test';

test.describe('Authentication & Registration Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should render login page with all inputs and controls', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'HPMBS Enterprise' })).toBeVisible();
    await expect(page.getByLabel(/Account Email \/ Phone \/ Login ID/i)).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In as Staff \/ Admin/i })).toBeVisible();
  });

  test('should toggle password visibility when clicking eye icon', async ({ page }) => {
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = page.getByRole('button', { name: /Show password|Hide password/i });
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should navigate to Hospital SaaS Registration page', async ({ page }) => {
    const registerLink = page.getByRole('link', { name: /Register your Hospital SaaS Tenant/i });
    await expect(registerLink).toBeVisible();
    await registerLink.click();

    await expect(page).toHaveURL('/register-hospital');
    await expect(page.getByRole('heading', { name: /Register Your Hospital/i })).toBeVisible();
  });

  test('should fill hospital registration form fields', async ({ page }) => {
    await page.goto('/register-hospital');

    await page.getByLabel('Hospital Name').fill('Metro Care Hospital');
    await page.getByLabel(/Hospital Domain/).fill('metrocare');
    await page.getByLabel('Contact Officer Name').fill('Dr. Sarah Jenkins');
    await page.getByLabel('Authorized Contact Email').fill('sarah@metrocare.com');
    await page.getByLabel('Desired Hospital Admin Password').fill('Password123!');
    await page.getByLabel('Confirm Admin Password').fill('Password123!');

    const registerBtn = page.getByRole('button', { name: /Submit Application/i });
    await expect(registerBtn).toBeVisible();
  });
});
