import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/authHelper.js';

test.describe('Super Admin Module Suite', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'SUPER_ADMIN');
    await page.goto('/admin/dashboard');
  });

  test('should render Super Admin platform overview dashboard', async ({ page }) => {
    await expect(page).toHaveURL('/admin/dashboard');
  });

  test('should access Super Admin Hospitals overview route', async ({ page }) => {
    await page.goto('/admin/hospitals');
    await expect(page).toHaveURL('/admin/hospitals');
  });

  test('should access Super Admin Hospital Admins route', async ({ page }) => {
    await page.goto('/admin/hospital-admins');
    await expect(page).toHaveURL('/admin/hospital-admins');
  });

  test('should access Super Admin Audit Logs route', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    await expect(page).toHaveURL('/admin/audit-logs');
  });

  test('should access Super Admin Subscriptions route', async ({ page }) => {
    await page.goto('/admin/subscriptions');
    await expect(page).toHaveURL('/admin/subscriptions');
  });

  test('should redirect unallowed global staff route to 403', async ({ page }) => {
    await page.goto('/admin/staff');
    await expect(page).toHaveURL('/403');
  });
});
