import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/authHelper.js';

test.describe('Patient & Guardian Portals Suite', () => {
  test('Patient Portal - Dashboard & Health Records', async ({ page }) => {
    await mockAuthSession(page, 'PATIENT');
    await page.goto('/patient-portal/dashboard');
    await expect(page).toHaveURL('/patient-portal/dashboard');

    await page.goto('/patient-portal/prescriptions');
    await expect(page).toHaveURL('/patient-portal/prescriptions');

    await page.goto('/patient-portal/billing');
    await expect(page).toHaveURL('/patient-portal/billing');
  });

  test('Guardian Portal - Dashboard & Progress Updates', async ({ page }) => {
    await mockAuthSession(page, 'GUARDIAN');
    await page.goto('/guardian-portal/dashboard');
    await expect(page).toHaveURL('/guardian-portal/dashboard');

    await page.goto('/guardian-portal/doctor-updates');
    await expect(page).toHaveURL('/guardian-portal/doctor-updates');

    await page.goto('/guardian-portal/billing');
    await expect(page).toHaveURL('/guardian-portal/billing');
  });
});
