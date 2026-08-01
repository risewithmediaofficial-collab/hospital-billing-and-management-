import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/authHelper.js';

test.describe('Receptionist Module Suite', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'RECEPTIONIST');
  });

  test('should access Reception Dashboard', async ({ page }) => {
    await page.goto('/reception/dashboard');
    await expect(page).toHaveURL('/reception/dashboard');
  });

  test('should access Registered Patients View', async ({ page }) => {
    await page.goto('/reception/registered-patients');
    await expect(page).toHaveURL('/reception/registered-patients');
  });

  test('should access Patient Registration Page', async ({ page }) => {
    await page.goto('/reception/register-patient');
    await expect(page).toHaveURL('/reception/register-patient');
  });

  test('should access OPD Token Calling Desk', async ({ page }) => {
    await page.goto('/reception/tokens');
    await expect(page).toHaveURL('/reception/tokens');
  });

  test('should access Visitor Pass Printing Desk', async ({ page }) => {
    await page.goto('/reception/visitors');
    await expect(page).toHaveURL('/reception/visitors');
  });
});
