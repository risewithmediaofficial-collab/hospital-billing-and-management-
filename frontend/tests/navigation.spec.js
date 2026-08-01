import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/authHelper.js';

test.describe('Navigation & Routing Edge Cases Suite', () => {
  test('should redirect root / to /login when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('should render 404 Not Found page for invalid route', async ({ page }) => {
    await mockAuthSession(page, 'SUPER_ADMIN');
    await page.goto('/some-non-existent-page-url');
    await expect(page.getByRole('heading', { name: /404|Resource Not Found/i })).toBeVisible();
  });

  test('should render 403 Forbidden page', async ({ page }) => {
    await mockAuthSession(page, 'SUPER_ADMIN');
    await page.goto('/403');
    await expect(page).toHaveURL('/403');
    await expect(page.getByRole('heading', { name: /403|Access Forbidden/i })).toBeVisible();
  });
});
