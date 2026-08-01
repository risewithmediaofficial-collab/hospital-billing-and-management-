import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/authHelper.js';

test.describe('Patient & Guardian Portals Comprehensive Suite', () => {
  test.describe('Patient Portal Complete Module Sub-Views', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthSession(page, 'PATIENT');
    });

    test('should load Patient Dashboard Overview', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await expect(page).toHaveURL('/patient-portal/dashboard');
      await expect(page.getByText('Patient Workspace').or(page.getByText('John Doe'))).toBeVisible();
    });

    test('should access My Profile view', async ({ page }) => {
      await page.goto('/patient-portal/profile');
      await expect(page).toHaveURL('/patient-portal/profile');
      await expect(page.getByText('Patient Personal Demographics & EHR Profile')).toBeVisible();
    });

    test('should access My Tokens view', async ({ page }) => {
      await page.goto('/patient-portal/tokens');
      await expect(page).toHaveURL('/patient-portal/tokens');
    });

    test('should access Current Treatment view', async ({ page }) => {
      await page.goto('/patient-portal/treatment');
      await expect(page).toHaveURL('/patient-portal/treatment');
    });

    test('should access Treatment History timeline', async ({ page }) => {
      await page.goto('/patient-portal/history');
      await expect(page).toHaveURL('/patient-portal/history');
      await expect(page.getByText('Treatment History')).toBeVisible();
    });

    test('should access Doctor Instructions view', async ({ page }) => {
      await page.goto('/patient-portal/doctor-instructions');
      await expect(page).toHaveURL('/patient-portal/doctor-instructions');
    });

    test('should access Prescriptions view', async ({ page }) => {
      await page.goto('/patient-portal/prescriptions');
      await expect(page).toHaveURL('/patient-portal/prescriptions');
      await expect(page.getByText('Approved E-Prescriptions History')).toBeVisible();
    });

    test('should access Laboratory Reports view', async ({ page }) => {
      await page.goto('/patient-portal/lab-reports');
      await expect(page).toHaveURL('/patient-portal/lab-reports');
    });

    test('should access Radiology Reports view', async ({ page }) => {
      await page.goto('/patient-portal/radiology-reports');
      await expect(page).toHaveURL('/patient-portal/radiology-reports');
    });

    test('should access Admission Details view', async ({ page }) => {
      await page.goto('/patient-portal/admission');
      await expect(page).toHaveURL('/patient-portal/admission');
    });

    test('should access Patient Care Team view', async ({ page }) => {
      await page.goto('/patient-portal/care-team');
      await expect(page).toHaveURL('/patient-portal/care-team');
      await expect(page.getByText('Assigned Clinical & Nursing Care Team')).toBeVisible();
    });

    test('should access Patient Care Requests console', async ({ page }) => {
      await page.goto('/patient-portal/requests');
      await expect(page).toHaveURL('/patient-portal/requests');
      await expect(page.getByText('Submit Patient Care Request')).toBeVisible();
    });

    test('should access Billing & Ledgers view', async ({ page }) => {
      await page.goto('/patient-portal/billing');
      await expect(page).toHaveURL('/patient-portal/billing');
    });

    test('should access Discharge Summary view', async ({ page }) => {
      await page.goto('/patient-portal/discharge');
      await expect(page).toHaveURL('/patient-portal/discharge');
    });

    test('should open Emergency Assistance confirmation modal', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      const emergencyBtn = page.getByRole('button', { name: /TRIGGER EMERGENCY/i }).first();
      await expect(emergencyBtn).toBeVisible();
      await emergencyBtn.click();
      await expect(page.getByText('Confirm Emergency Code Blue Dispatch')).toBeVisible();
    });
  });

  test.describe('Guardian Portal Complete Module Sub-Views', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthSession(page, 'GUARDIAN');
    });

    test('should load Guardian Dashboard Console', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      await expect(page).toHaveURL('/guardian-portal/dashboard');
      await expect(page.getByText('Guardian Care & Monitoring Console')).toBeVisible();
    });

    test('should access Patient Overview', async ({ page }) => {
      await page.goto('/guardian-portal/overview');
      await expect(page).toHaveURL('/guardian-portal/overview');
    });

    test('should access Guardian Current Treatment', async ({ page }) => {
      await page.goto('/guardian-portal/treatment');
      await expect(page).toHaveURL('/guardian-portal/treatment');
    });

    test('should access Guardian Doctor Updates view', async ({ page }) => {
      await page.goto('/guardian-portal/doctor-updates');
      await expect(page).toHaveURL('/guardian-portal/doctor-updates');
    });

    test('should access Guardian Treatment History view', async ({ page }) => {
      await page.goto('/guardian-portal/history');
      await expect(page).toHaveURL('/guardian-portal/history');
    });

    test('should access Guardian Prescriptions view', async ({ page }) => {
      await page.goto('/guardian-portal/prescriptions');
      await expect(page).toHaveURL('/guardian-portal/prescriptions');
    });

    test('should access Guardian Lab & Radiology Reports', async ({ page }) => {
      await page.goto('/guardian-portal/reports');
      await expect(page).toHaveURL('/guardian-portal/reports');
    });

    test('should access Guardian Admission Details', async ({ page }) => {
      await page.goto('/guardian-portal/admission');
      await expect(page).toHaveURL('/guardian-portal/admission');
    });

    test('should access Guardian Care Team view', async ({ page }) => {
      await page.goto('/guardian-portal/care-team');
      await expect(page).toHaveURL('/guardian-portal/care-team');
    });

    test('should access Guardian Requests Monitor', async ({ page }) => {
      await page.goto('/guardian-portal/requests');
      await expect(page).toHaveURL('/guardian-portal/requests');
    });

    test('should access Guardian Billing & Payments', async ({ page }) => {
      await page.goto('/guardian-portal/billing');
      await expect(page).toHaveURL('/guardian-portal/billing');
    });

    test('should open Link Patient UHID modal', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      const linkBtn = page.getByRole('button', { name: /Link Patient UHID/i }).first();
      await expect(linkBtn).toBeVisible();
      await linkBtn.click();
      await expect(page.getByText('Link Patient to Guardian Account')).toBeVisible();
    });
  });
});
