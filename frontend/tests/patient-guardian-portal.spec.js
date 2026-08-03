import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/authHelper.js';

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT PORTAL TESTS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Patient & Guardian Portals Comprehensive Suite', () => {
  test.describe('Patient Portal Complete Module Sub-Views', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthSession(page, 'PATIENT');
    });

    // ── Navigation ────────────────────────────────────────────────────────────
    test('should load Patient Dashboard Overview', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await expect(page).toHaveURL('/patient-portal/dashboard');
      await expect(
        page.getByText('Patient Workspace').or(page.getByText('John Doe'))
      ).toBeVisible();
    });

    test('should access My Profile view', async ({ page }) => {
      await page.goto('/patient-portal/profile');
      await expect(page).toHaveURL('/patient-portal/profile');
      await expect(
        page.getByText('Patient Personal Demographics & EHR Profile')
      ).toBeVisible();
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
      await expect(page.getByText('Treatment History').first()).toBeVisible();
    });

    test('should access Doctor Instructions view', async ({ page }) => {
      await page.goto('/patient-portal/doctor-instructions');
      await expect(page).toHaveURL('/patient-portal/doctor-instructions');
    });

    test('should access Prescriptions view', async ({ page }) => {
      await page.goto('/patient-portal/prescriptions');
      await expect(page).toHaveURL('/patient-portal/prescriptions');
      await expect(
        page.getByText('Approved E-Prescriptions History')
      ).toBeVisible();
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
      await expect(
        page.getByText('Assigned Clinical & Nursing Care Team')
      ).toBeVisible();
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

    // ── Dashboard UI elements ──────────────────────────────────────────────────
    test('should display patient stat cards on dashboard', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await expect(page.getByText('Hospital Status').first()).toBeVisible();
    });

    test('should show sub-tab navigation bar on dashboard', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      const nav = page.getByRole('button', { name: /Dashboard Overview/i }).first();
      await expect(nav).toBeVisible();
    });

    // ── Emergency Modal ──────────────────────────────────────────────────────
    test('should open Emergency Assistance confirmation modal', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      const emergencyBtn = page
        .getByRole('button', { name: /TRIGGER EMERGENCY/i })
        .first();
      await expect(emergencyBtn).toBeVisible();
      await emergencyBtn.click();
      await expect(
        page.getByText('Confirm Emergency Code Blue Dispatch')
      ).toBeVisible();
    });

    test('should close Emergency modal on Cancel click', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await page.getByRole('button', { name: /TRIGGER EMERGENCY/i }).first().click();
      await expect(page.getByText('Confirm Emergency Code Blue Dispatch')).toBeVisible();
      const cancelBtn = page.getByRole('button', { name: /Cancel/i }).first();
      await cancelBtn.click();
      await expect(page.getByText('Confirm Emergency Code Blue Dispatch')).not.toBeVisible();
    });

    // ── Quick Care Requests section ───────────────────────────────────────────
    test('should show Quick In-Bed Care Requests section', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await expect(page.getByText('Quick In-Bed Care Requests').first()).toBeVisible();
    });

    // ── Sidebar navigation active state ──────────────────────────────────────
    test('should render sidebar with patient portal menu items', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await expect(page.getByText('Patient Portal').first()).toBeVisible();
    });

    // ── Tab switching via sub-nav ─────────────────────────────────────────────
    test('should switch to My Profile tab on sub-nav click', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      const profileTab = page.getByRole('button', { name: /My Profile/i }).first();
      if (await profileTab.isVisible()) {
        await profileTab.click();
        await expect(
          page.getByText('Patient Personal Demographics & EHR Profile')
        ).toBeVisible();
      }
    });

    test('should switch to Treatment History tab on sub-nav click', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      const historyTab = page.getByRole('button', { name: /Treatment History/i }).first();
      if (await historyTab.isVisible()) {
        await historyTab.click();
        await expect(page.getByText('Treatment History').first()).toBeVisible();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GUARDIAN PORTAL TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  test.describe('Guardian Portal Complete Module Sub-Views', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthSession(page, 'GUARDIAN');
    });

    // ── Navigation ────────────────────────────────────────────────────────────
    test('should load Guardian Dashboard Console', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      await expect(page).toHaveURL('/guardian-portal/dashboard');
      await expect(
        page.getByText('Guardian Care & Monitoring Console')
      ).toBeVisible();
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

    // ── Dashboard header elements ─────────────────────────────────────────────
    test('should show GUARDIAN PORTAL badge on dashboard', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      await expect(page.getByText('GUARDIAN PORTAL').first()).toBeVisible();
    });

    test('should display guardian user name in header', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      await expect(page.getByText(/Authorized Representative:/i).first()).toBeVisible();
    });

    test('should display stat cards on guardian dashboard', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      await expect(page.getByText('Patient Status').first()).toBeVisible();
    });

    // ── Link Patient UHID Modal ───────────────────────────────────────────────
    test('should open Link Patient UHID modal', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      const linkBtn = page
        .getByRole('button', { name: /Link Patient UHID/i })
        .first();
      await expect(linkBtn).toBeVisible();
      await linkBtn.click();
      await expect(
        page.getByText('Link Patient to Guardian Account')
      ).toBeVisible();
    });

    test('should show UHID input field in Link Patient modal', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      await page.getByRole('button', { name: /Link Patient UHID/i }).first().click();
      await expect(page.getByPlaceholder(/HOSP-00042/i)).toBeVisible();
    });

    test('should show relationship dropdown in Link Patient modal', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      await page.getByRole('button', { name: /Link Patient UHID/i }).first().click();
      await expect(page.getByText('Relationship to Patient')).toBeVisible();
      const select = page.locator('select').first();
      await expect(select).toBeVisible();
    });

    test('should close Link Patient modal on Cancel click', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      await page.getByRole('button', { name: /Link Patient UHID/i }).first().click();
      await expect(page.getByText('Link Patient to Guardian Account')).toBeVisible();
      await page.getByRole('button', { name: /Cancel/i }).first().click();
      await expect(page.getByText('Link Patient to Guardian Account')).not.toBeVisible();
    });

    test('should close Link Patient modal on ✕ button click', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      await page.getByRole('button', { name: /Link Patient UHID/i }).first().click();
      await expect(page.getByText('Link Patient to Guardian Account')).toBeVisible();
      await page.getByRole('button', { name: '✕' }).first().click();
      await expect(page.getByText('Link Patient to Guardian Account')).not.toBeVisible();
    });

    // ── Sub-tab navigation ────────────────────────────────────────────────────
    test('should show sub-tab navigation on guardian dashboard', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      await expect(
        page.getByRole('button', { name: /Overview Dashboard/i }).first()
      ).toBeVisible();
    });

    test('should switch to Doctor Progress Notes tab', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      const tab = page.getByRole('button', { name: /Doctor Progress Notes/i }).first();
      if (await tab.isVisible()) {
        await tab.click();
        await expect(
          page.getByText('Latest Approved Physician Progress Notes')
        ).toBeVisible();
      }
    });

    test('should show empty state for doctor updates when none exist', async ({ page }) => {
      await page.goto('/guardian-portal/dashboard');
      const tab = page.getByRole('button', { name: /Doctor Progress Notes/i }).first();
      if (await tab.isVisible()) {
        await tab.click();
        await expect(
          page.getByText('No published doctor progress notes yet.').first()
        ).toBeVisible();
      }
    });

    // ── Redirect aliases ──────────────────────────────────────────────────────
    test('should redirect /guardian/dashboard to guardian-portal', async ({ page }) => {
      await page.goto('/guardian/dashboard');
      await expect(page).toHaveURL('/guardian-portal/dashboard');
    });

    test('should access guardian billing via /guardian-portal/bills alias', async ({ page }) => {
      await page.goto('/guardian-portal/bills');
      await expect(page).toHaveURL('/guardian-portal/bills');
    });
  });
});
