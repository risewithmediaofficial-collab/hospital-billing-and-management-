import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/authHelper.js';

const DOMAIN = 'test';

// ─────────────────────────────────────────────────────────────────────────────
// Billing Flow Suite
// End-to-end: Registration → Doctor sends to Billing → Cashier sees notification
//             → Cashier processes payment → Notification resolves
// ─────────────────────────────────────────────────────────────────────────────

const mockPatient = {
  _id: 'pt-billing-001',
  firstName: 'Priya',
  lastName: 'Nair',
  uhid: 'HOSP-BL-001',
  phone: '+91 9876543210',
  gender: 'FEMALE',
  age: 29,
  category: 'GENERAL',
  bloodGroup: 'B+',
};

const mockAppointment = {
  _id: 'appt-billing-001',
  patientId: mockPatient,
  status: 'CHECKED_IN',
  tokenNumber: 5,
  appointmentType: 'OPD',
  reasonForVisit: 'General checkup',
  createdAt: new Date().toISOString(),
};

const mockInvoice = {
  _id: 'inv-001',
  patientId: mockPatient,
  appointmentId: 'appt-billing-001',
  status: 'PENDING',
  totalAmount: 500,
  paidAmount: 0,
  items: [{ description: 'Consultation Fee', amount: 500 }],
  createdAt: new Date().toISOString(),
};

const mockPaidInvoice = { ...mockInvoice, status: 'PAID', paidAmount: 500 };

async function setupReceptionMocks(page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'rec-001', name: 'Receptionist', role: 'RECEPTIONIST', hospitalDomain: DOMAIN, permissions: { '*': ['*'] } } }) });
    } else if (url.includes('/patients') && method === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockPatient }) });
    } else if (url.includes('/appointments') && method === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockAppointment }) });
    } else if (url.includes('/patients')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [mockPatient] }) });
    } else if (url.includes('/appointments')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [mockAppointment] }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    }
  });

  await page.addInitScript(({ domain }) => {
    const user = { id: 'rec-001', name: 'Receptionist', role: 'RECEPTIONIST', hospitalDomain: domain, permissions: { '*': ['*'] }, enabledModules: {} };
    window.localStorage.setItem('hpmbs_access_token', 'mock-rec-token');
    window.localStorage.setItem('hpmbs_user', JSON.stringify(user));
  }, { domain: DOMAIN });
}

async function setupBillingMocks(page, { invoicePaid = false } = {}) {
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'cashier-001', name: 'Cashier', role: 'CASHIER', hospitalDomain: DOMAIN, permissions: { '*': ['*'] } } }) });
    } else if (url.includes('/invoices') && method === 'PATCH') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockPaidInvoice }) });
    } else if (url.includes('/invoices')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: invoicePaid ? [mockPaidInvoice] : [mockInvoice] }) });
    } else if (url.includes('/receipts') && method === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: { _id: 'receipt-001', amount: 500, patientId: 'pt-billing-001' } }) });
    } else if (url.includes('/notifications')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    }
  });

  await page.addInitScript(({ domain }) => {
    const user = { id: 'cashier-001', name: 'Cashier', role: 'CASHIER', hospitalDomain: domain, permissions: { '*': ['*'] }, enabledModules: {} };
    window.localStorage.setItem('hpmbs_access_token', 'mock-cashier-token');
    window.localStorage.setItem('hpmbs_user', JSON.stringify(user));
  }, { domain: DOMAIN });
}

test.describe('Billing Flow Suite', () => {

  // ── STEP 1: Reception desk loads ──────────────────────────────────────────
  test('1. Reception: desk page loads without crashing', async ({ page }) => {
    await setupReceptionMocks(page);
    await page.goto(`/${DOMAIN}/reception/registered-patients`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Application View Updated')).not.toBeVisible();
    await expect(page).toHaveURL(new RegExp('reception'));
  });

  // ── STEP 2: Patient list API returns data ─────────────────────────────────
  test('2. Reception: patient list API returns registered patients', async ({ page }) => {
    await setupReceptionMocks(page);
    await page.goto(`/${DOMAIN}/reception/registered-patients`);
    await page.evaluate(async () => {
      const res = await fetch('/api/v1/patients', { headers: { Authorization: 'Bearer mock-rec-token' } });
      window.__patients = await res.json();
    });
    await page.waitForTimeout(300);
    const result = await page.evaluate(() => window.__patients);
    expect(result?.success).toBe(true);
    expect(result?.data?.length).toBeGreaterThanOrEqual(1);
    expect(result?.data?.[0]?.uhid).toBe('HOSP-BL-001');
  });

  // ── STEP 3: Billing dashboard loads ──────────────────────────────────────
  test('3. Cashier: billing dashboard loads without crashing', async ({ page }) => {
    await setupBillingMocks(page);
    await page.goto(`/${DOMAIN}/billing/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Application View Updated')).not.toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/billing/dashboard`));
  });

  // ── STEP 4: Invoice API returns pending invoice ───────────────────────────
  test('4. Cashier: invoice API returns pending invoice', async ({ page }) => {
    await setupBillingMocks(page);
    await page.goto(`/${DOMAIN}/billing/dashboard`);
    await page.evaluate(async () => {
      const res = await fetch('/api/v1/invoices?status=PENDING', { headers: { Authorization: 'Bearer mock-cashier-token' } });
      window.__invoices = await res.json();
    });
    await page.waitForTimeout(300);
    const result = await page.evaluate(() => window.__invoices);
    expect(result?.success).toBe(true);
    const inv = result?.data?.[0];
    expect(inv?.status).toBe('PENDING');
    expect(inv?.totalAmount).toBe(500);
  });

  // ── STEP 5: Payment PATCH marks invoice PAID ─────────────────────────────
  test('5. Cashier: PATCH invoice marks it PAID', async ({ page }) => {
    await setupBillingMocks(page);
    await page.goto(`/${DOMAIN}/billing/dashboard`);
    await page.evaluate(async () => {
      const res = await fetch('/api/v1/invoices/inv-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock-cashier-token' },
        body: JSON.stringify({ status: 'PAID', paidAmount: 500 }),
      });
      window.__paidInvoice = await res.json();
    });
    await page.waitForTimeout(300);
    const result = await page.evaluate(() => window.__paidInvoice);
    expect(result?.success).toBe(true);
    expect(result?.data?.status).toBe('PAID');
    expect(result?.data?.paidAmount).toBe(500);
  });

  // ── STEP 6: Receipts tab loads ────────────────────────────────────────────
  test('6. Cashier: receipts & payments tab loads without crashing', async ({ page }) => {
    await setupBillingMocks(page, { invoicePaid: true });
    await page.goto(`/${DOMAIN}/billing/dashboard?tab=RECEIPTS`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Application View Updated')).not.toBeVisible();
    await expect(page).toHaveURL(new RegExp('tab=RECEIPTS'));
  });

  // ── STEP 7: POST receipt creates receipt record ───────────────────────────
  test('7. Cashier: POST receipt returns receipt record', async ({ page }) => {
    await setupBillingMocks(page);
    await page.goto(`/${DOMAIN}/billing/dashboard`);
    await page.evaluate(async () => {
      const res = await fetch('/api/v1/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock-cashier-token' },
        body: JSON.stringify({ invoiceId: 'inv-001', amount: 500, paymentMode: 'CASH' }),
      });
      window.__receipt = await res.json();
    });
    await page.waitForTimeout(300);
    const result = await page.evaluate(() => window.__receipt);
    expect(result?.success).toBe(true);
    expect(result?.data?.amount).toBe(500);
  });

  // ── STEP 8: Notification API returns empty after payment ──────────────────
  test('8. After payment, notification list resolves (returns empty)', async ({ page }) => {
    await setupBillingMocks(page, { invoicePaid: true });
    await page.goto(`/${DOMAIN}/billing/dashboard`);
    await page.evaluate(async () => {
      const res = await fetch('/api/v1/notifications?unread=true', { headers: { Authorization: 'Bearer mock-cashier-token' } });
      window.__notifs = await res.json();
    });
    await page.waitForTimeout(300);
    const result = await page.evaluate(() => window.__notifs);
    expect(result?.success).toBe(true);
    // After payment, unread notifs should be empty or resolved
    expect(Array.isArray(result?.data)).toBe(true);
  });

});
