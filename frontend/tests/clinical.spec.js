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

    test('guardian message notification opens the exact doctor response record', async ({ page }) => {
      await page.route('**/api/v1/requests?**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [{
            _id: 'guardian-doctor-request-1',
            requestType: 'DOCTOR',
            requestCategory: 'DOCTOR',
            requestedBy: 'GUARDIAN',
            status: 'SUBMITTED',
            notes: '[Guardian Treatment Reminder] Please review the latest report.',
            patientId: { _id: 'test-patient-id', firstName: 'John', lastName: 'Doe', uhid: 'HOSP-00042' },
            createdAt: new Date().toISOString(),
          }] }),
        });
      });
      await page.goto('/doctor/dashboard?tab=DEPT_RESPONSES&requestId=guardian-doctor-request-1');
      const exactRecord = page.locator('#doctor-patient-request-guardian-doctor-request-1');
      await expect(exactRecord).toBeVisible();
      await expect(exactRecord).toContainText('Guardian Treatment Reminder');
      await expect(exactRecord).toHaveClass(/ring-2/);
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
