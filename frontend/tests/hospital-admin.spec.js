import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/authHelper.js';

test.describe('Hospital Admin Module Suite', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'HOSPITAL_ADMIN');
  });

  test('should open Hospital Admin dashboard route', async ({ page }) => {
    await page.goto('/hospital-admin/dashboard');
    await expect(page).toHaveURL('/hospital-admin/dashboard');
  });

  test('should access Doctors Management view', async ({ page }) => {
    await page.goto('/hospital-admin/doctors-management');
    await expect(page).toHaveURL('/hospital-admin/doctors-management');
  });

  test('should access Nurses Management view', async ({ page }) => {
    await page.goto('/hospital-admin/nurses-management');
    await expect(page).toHaveURL('/hospital-admin/nurses-management');
  });

  test('should access Billing Management view', async ({ page }) => {
    await page.goto('/hospital-admin/billing-management');
    await expect(page).toHaveURL('/hospital-admin/billing-management');
  });

  test('should access Tariffs & Price Master view', async ({ page }) => {
    await page.goto('/hospital-admin/tariffs');
    await expect(page).toHaveURL('/hospital-admin/tariffs');
  });

  test('should access Plan Details view', async ({ page }) => {
    await page.goto('/hospital-admin/plan-details');
    await expect(page).toHaveURL('/hospital-admin/plan-details');
  });
});
