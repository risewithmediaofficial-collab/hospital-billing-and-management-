import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/authHelper.js';

test.describe('Ancillary Departments Suite', () => {
  test('Pharmacy - Dashboard & Dispense Queue', async ({ page }) => {
    await mockAuthSession(page, 'PHARMACIST');
    await page.goto('/pharmacy/dashboard');
    await expect(page).toHaveURL('/pharmacy/dashboard');

    await page.goto('/pharmacy/dispense-queue');
    await expect(page).toHaveURL('/pharmacy/dispense-queue');
  });

  test('Laboratory - Dashboard & Samples', async ({ page }) => {
    await mockAuthSession(page, 'LAB_TECH');
    await page.goto('/laboratory/dashboard');
    await expect(page).toHaveURL('/laboratory/dashboard');

    await page.goto('/laboratory/samples');
    await expect(page).toHaveURL('/laboratory/samples');
  });

  test('Radiology - Dashboard & DICOM Viewer', async ({ page }) => {
    await mockAuthSession(page, 'RADIOLOGIST');
    await page.goto('/radiology/dashboard');
    await expect(page).toHaveURL('/radiology/dashboard');

    await page.goto('/radiology/dicom');
    await expect(page).toHaveURL('/radiology/dicom');
  });

  test('Cashier & Billing - Invoice Generator & Shift Close', async ({ page }) => {
    await mockAuthSession(page, 'CASHIER');
    await page.goto('/billing/dashboard');
    await expect(page).toHaveURL('/billing/dashboard');

    await page.goto('/billing/create-invoice');
    await expect(page).toHaveURL('/billing/create-invoice');

    await page.goto('/billing/shift-close');
    await expect(page).toHaveURL('/billing/shift-close');
  });

  test('Inventory Manager - Indents & Purchase Orders', async ({ page }) => {
    await mockAuthSession(page, 'INVENTORY_MANAGER');
    await page.goto('/inventory/dashboard');
    await expect(page).toHaveURL('/inventory/dashboard');

    await page.goto('/inventory/indents');
    await expect(page).toHaveURL('/inventory/indents');
  });

  test('HR Manager - Duty Roster & Attendance', async ({ page }) => {
    await mockAuthSession(page, 'HR_MANAGER');
    await page.goto('/hr/dashboard');
    await expect(page).toHaveURL('/hr/dashboard');

    await page.goto('/hr/roster');
    await expect(page).toHaveURL('/hr/roster');
  });
});
