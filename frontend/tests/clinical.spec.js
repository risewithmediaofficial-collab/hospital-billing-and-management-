import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/authHelper.js';

test.describe('Clinical Workflows Suite', () => {
  test.describe('Doctor Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthSession(page, 'DOCTOR');
    });

    test('should load Doctor Dashboard & Queue', async ({ page }) => {
      await page.goto('/doctor/dashboard');
      await expect(page).toHaveURL('/doctor/dashboard');
    });

    test('should access Prescriptions view', async ({ page }) => {
      await page.goto('/doctor/prescriptions');
      await expect(page).toHaveURL('/doctor/prescriptions');
    });

    test('should access Diagnostics view', async ({ page }) => {
      await page.goto('/doctor/diagnostics');
      await expect(page).toHaveURL('/doctor/diagnostics');
    });
  });

  test.describe('Nursing Console', () => {
    test('should load Nurse Dashboard', async ({ page }) => {
      await mockAuthSession(page, 'NURSE');
      await page.goto('/nursing/dashboard');
      await expect(page).toHaveURL('/nursing/dashboard');
    });

    test('should access Bed Matrix Console', async ({ page }) => {
      await mockAuthSession(page, 'NURSE');
      await page.goto('/nursing/beds');
      await expect(page).toHaveURL('/nursing/beds');
    });

    test('should load Nurse In-Charge Dashboard', async ({ page }) => {
      await mockAuthSession(page, 'NURSE_INCHARGE');
      await page.goto('/nurse-incharge/dashboard');
      await expect(page).toHaveURL('/nurse-incharge/dashboard');
    });
  });

  test.describe('Emergency Console', () => {
    test('should load Emergency Console view', async ({ page }) => {
      await mockAuthSession(page, 'DOCTOR');
      await page.goto('/emergency');
      await expect(page).toHaveURL('/emergency');
    });
  });
});
