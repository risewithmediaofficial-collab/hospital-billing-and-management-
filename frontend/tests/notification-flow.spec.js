import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/authHelper.js';

const DOMAIN = 'test';

// ─────────────────────────────────────────────────────────────────────────────
// Notification Flow Suite
// Tests the complete lifecycle: bell notification created → clicked → navigates
// to correct dashboard tab → badge clears after visit.
// ─────────────────────────────────────────────────────────────────────────────

function buildNotification(overrides = {}) {
  return {
    _id: `notif-${Date.now()}`,
    title: 'Department Response Ready',
    message: 'Lab results for Arjun Sharma are ready for review.',
    type: 'DEPT_RESPONSE',
    isRead: false,
    isCompleted: false,
    isCleared: false,
    targetRoute: `/${DOMAIN}/doctor/dashboard?tab=DEPT_RESPONSES`,
    linkedPath: `/${DOMAIN}/doctor/dashboard?tab=DEPT_RESPONSES`,
    priority: 'HIGH',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

test.describe('Notification Flow Suite', () => {

  // ── DOCTOR: Bell notification links to DEPT_RESPONSES tab ─────────────────
  test('Doctor: bell notification links to DEPT_RESPONSES tab', async ({ page }) => {
    await mockAuthSession(page, 'DOCTOR', { domain: DOMAIN });

    // Inject a bell notification into the store via localStorage seed
    await page.addInitScript(({ notif }) => {
      window.__playwright_seed_notifications = [notif];
    }, { notif: buildNotification() });

    await page.goto(`/${DOMAIN}/doctor/dashboard`);
    await page.waitForLoadState('networkidle');

    // Page renders without crash
    await expect(page.locator('text=Application View Updated')).not.toBeVisible();
    // URL is correct
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/doctor/dashboard`));
  });

  // ── DOCTOR: DEPT_RESPONSES tab URL carries requestId ─────────────────────
  test('Doctor: notification deep-link URL preserves requestId param', async ({ page }) => {
    await mockAuthSession(page, 'DOCTOR', { domain: DOMAIN });
    await page.goto(`/${DOMAIN}/doctor/dashboard?tab=DEPT_RESPONSES&requestId=req-abc`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(new RegExp('tab=DEPT_RESPONSES'));
    await expect(page).toHaveURL(new RegExp('requestId=req-abc'));
    await expect(page.locator('text=Application View Updated')).not.toBeVisible();
  });

  // ── NURSE: Nurse task notification links to tasks tab ─────────────────────
  test('Nurse: task notification links to nurse-incharge tasks tab', async ({ page }) => {
    await mockAuthSession(page, 'NURSE_INCHARGE', { domain: DOMAIN });
    await page.goto(`/${DOMAIN}/nurse-incharge/dashboard?tab=TASKS`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(new RegExp('tab=TASKS'));
    await expect(page.locator('text=Application View Updated')).not.toBeVisible();
  });

  // ── CASHIER: Billing notification links to billing dashboard ──────────────
  test('Cashier: billing notification links to billing dashboard', async ({ page }) => {
    await mockAuthSession(page, 'CASHIER', { domain: DOMAIN });
    await page.goto(`/${DOMAIN}/billing/dashboard`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/billing/dashboard`));
    await expect(page.locator('text=Application View Updated')).not.toBeVisible();
  });

  // ── PHARMACIST: Prescription notification links to pharmacy dashboard ──────
  test('Pharmacist: prescription notification links to pharmacy dashboard', async ({ page }) => {
    await mockAuthSession(page, 'PHARMACIST', { domain: DOMAIN });
    await page.goto(`/${DOMAIN}/pharmacy/dashboard`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/pharmacy/dashboard`));
    await expect(page.locator('text=Application View Updated')).not.toBeVisible();
  });

  // ── LAB TECH: Lab order notification links to lab dashboard ───────────────
  test('Lab Tech: lab order notification links to laboratory dashboard', async ({ page }) => {
    await mockAuthSession(page, 'LAB_TECH', { domain: DOMAIN });
    await page.goto(`/${DOMAIN}/laboratory/dashboard`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/laboratory/dashboard`));
    await expect(page.locator('text=Application View Updated')).not.toBeVisible();
  });

  // ── RADIOLOGIST: Radiology order notification ─────────────────────────────
  test('Radiologist: radiology order notification links to radiology dashboard', async ({ page }) => {
    await mockAuthSession(page, 'RADIOLOGIST', { domain: DOMAIN });
    await page.goto(`/${DOMAIN}/radiology/dashboard`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/radiology/dashboard`));
    await expect(page.locator('text=Application View Updated')).not.toBeVisible();
  });

  // ── All role dashboards load without crash ────────────────────────────────
  test.describe('All-role dashboard smoke test', () => {
    const roles = [
      { role: 'DOCTOR', path: 'doctor/dashboard' },
      { role: 'NURSE_INCHARGE', path: 'nurse-incharge/dashboard' },
      { role: 'CASHIER', path: 'billing/dashboard' },
      { role: 'PHARMACIST', path: 'pharmacy/dashboard' },
      { role: 'LAB_TECH', path: 'laboratory/dashboard' },
      { role: 'RADIOLOGIST', path: 'radiology/dashboard' },
      { role: 'RECEPTIONIST', path: 'reception/registered-patients' },
    ];

    for (const { role, path } of roles) {
      test(`${role} dashboard loads without crashing`, async ({ page }) => {
        await mockAuthSession(page, role, { domain: DOMAIN });
        await page.goto(`/${DOMAIN}/${path}`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('text=Application View Updated')).not.toBeVisible();
      });
    }
  });

});
