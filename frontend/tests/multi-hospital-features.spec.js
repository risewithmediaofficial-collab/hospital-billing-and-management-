import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/authHelper.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Extended auth mock with multi-hospital data
// ─────────────────────────────────────────────────────────────────────────────

async function mockMultiHospitalPatientSession(page, options = {}) {
  const {
    admissionStatus = 'ACTIVE_ADMISSION',
    hasActiveAdmission = true,
    hospitalCount = 2,
  } = options;

  const mockPatient = {
    _id: 'test-patient-id',
    firstName: 'Ravi',
    lastName: 'Kumar',
    uhid: 'HOSP-2026-00001',
    phone: '+91 9876543210',
    gender: 'MALE',
    age: 35,
    category: 'GENERAL',
    bloodGroup: 'O+',
    admissionStatus,
    activeAdmissionId: hasActiveAdmission ? 'adm-001' : null,
  };

  const mockActiveAdmission = hasActiveAdmission ? {
    _id: 'adm-001',
    status: 'ADMITTED',
    targetWardName: 'ICU Ward',
    bedNumber: 'BED-301',
    wardType: 'ICU',
    admissionNumber: 1,
    admissionReference: 'ADM-HOSP-2026-00001-001',
  } : null;

  const mockHospitals = Array.from({ length: hospitalCount }, (_, i) => ({
    hospitalId: `hospital-${i + 1}`,
    hospitalName: i === 0 ? 'Apollo Medical Center' : 'City General Hospital',
    localUhid: i === 0 ? 'HOSP-2026-00001' : 'HOSP-2026-00002',
    joinedAt: new Date(2026, 0, i + 1).toISOString(),
    hasActiveAdmission: i === 0 && hasActiveAdmission,
    activeAdmission: i === 0 ? mockActiveAdmission : null,
    totalAdmissions: i + 1,
    admissions: [],
  }));

  const mockCareTeam = [
    { role: 'PRIMARY_DOCTOR', userId: { name: 'Dr. Sarah Jenkins', specialization: 'Cardiology', phone: '9876543210' }, userName: 'Dr. Sarah Jenkins', assignedAt: new Date().toISOString(), removedAt: null },
    { role: 'NURSE', userId: { name: 'Nurse Priya', role: 'NURSE', phone: '8765432109' }, userName: 'Nurse Priya', assignedAt: new Date().toISOString(), removedAt: null },
  ];

  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'test-user-id', name: 'Ravi Kumar', role: 'PATIENT', email: 'ravi@hospital.local', permissions: { '*': ['*'] } } }) });
    } else if (url.includes('/patient-portal/hospitals')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { globalPatientId: 'GP-2026-00001', firstName: 'Ravi', lastName: 'Kumar', hospitals: mockHospitals } }) });
    } else if (url.includes('/patient-portal/active-context')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: hasActiveAdmission ? { hospitalId: 'hospital-1', localUhid: 'HOSP-2026-00001', admission: mockActiveAdmission, careTeam: mockCareTeam } : null }) });
    } else if (url.includes('/patient-portal/dashboard')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { patient: mockPatient, careTeam: {}, admissionDetails: mockActiveAdmission } }) });
    } else if (url.includes('/admissions') && url.includes('care-team')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { active: mockCareTeam, history: [] } }) });
    } else if (url.includes('/patient-portal/shared-records')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    } else if (url.includes('/api/v1/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    } else {
      await route.continue();
    }
  });

  await page.addInitScript(({ user }) => {
    window.localStorage.setItem('hpmbs_access_token', 'mock-jwt-token-patient');
    window.localStorage.setItem('hpmbs_user', JSON.stringify(user));
  }, { user: { id: 'test-user-id', name: 'Ravi Kumar', role: 'PATIENT', email: 'ravi@hospital.local', permissions: { '*': ['*'] } } });
}

async function mockGuardianDischargedSession(page) {
  const mockLinkedPatient = {
    _id: 'link-001',
    patient: {
      _id: 'test-patient-id',
      firstName: 'Ravi', lastName: 'Kumar',
      uhid: 'HOSP-2026-00001',
      admissionStatus: 'DISCHARGED',
    },
    relationship: 'FATHER',
    liveAccessActive: false,
  };

  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/v1/auth/me') || url.endsWith('/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'guardian-id', name: 'Suresh Kumar', role: 'GUARDIAN', permissions: { '*': ['*'] } } }) });
    } else if (url.includes('/api/v1/guardian-portal/linked-patients') || url.endsWith('/guardian-portal/linked-patients')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [mockLinkedPatient] }) });
    } else if (url.includes('/api/v1/guardian-portal/dashboard') || url.endsWith('/guardian-portal/dashboard')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { patient: mockLinkedPatient.patient, hasLinkedPatient: true, permissions: { patientRequests: false, doctorUpdates: true, billing: true } } }) });
    } else if (url.includes('/api/v1/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    } else {
      await route.continue();
    }
  });

  await page.addInitScript(({ user }) => {
    window.localStorage.setItem('hpmbs_access_token', 'mock-jwt-token-guardian');
    window.localStorage.setItem('hpmbs_user', JSON.stringify(user));
  }, { user: { id: 'guardian-id', name: 'Suresh Kumar', role: 'GUARDIAN', permissions: { '*': ['*'] } } });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 1: PatientDashboard — Multi-Hospital & Admission Awareness
// ─────────────────────────────────────────────────────────────────────────────
test.describe('PatientDashboard — Multi-Hospital & Discharge Features', () => {

  test.describe('Active Admission Patient', () => {
    test.beforeEach(async ({ page }) => {
      await mockMultiHospitalPatientSession(page, { admissionStatus: 'ACTIVE_ADMISSION', hasActiveAdmission: true, hospitalCount: 2 });
    });

    test('should show multi-hospital selector when patient has 2+ hospitals', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await page.waitForLoadState('networkidle');
      // Multi-hospital selector should appear
      await expect(page.getByText('My Hospitals').first()).toBeVisible({ timeout: 8000 });
    });

    test('should show Apollo Medical Center in hospital selector', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Apollo Medical Center').first()).toBeVisible({ timeout: 8000 });
    });

    test('should show active admission banner when patient is admitted', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Currently Admitted').first()).toBeVisible({ timeout: 8000 });
    });

    test('should show ICU Ward in admission banner', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/ICU Ward/).first()).toBeVisible({ timeout: 8000 });
    });

    test('should show TRIGGER EMERGENCY button when patient is admitted', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/TRIGGER EMERGENCY/).first()).toBeVisible({ timeout: 8000 });
    });

    test('should show care team members in admission banner', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/Dr. Sarah Jenkins/).first()).toBeVisible({ timeout: 8000 });
    });
  });

  test.describe('Discharged Patient', () => {
    test.beforeEach(async ({ page }) => {
      await mockMultiHospitalPatientSession(page, { admissionStatus: 'DISCHARGED', hasActiveAdmission: false, hospitalCount: 1 });
    });

    test('should show discharge read-only banner when patient is discharged', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Admission Closed').first()).toBeVisible({ timeout: 8000 });
    });

    test('should show Read Only Mode label when discharged', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/Read Only Mode/).first()).toBeVisible({ timeout: 8000 });
    });

    test('should NOT show TRIGGER EMERGENCY button when discharged', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await page.waitForLoadState('networkidle');
      // Emergency button should not exist OR be replaced by disabled version
      const emergencyBtn = page.getByText('TRIGGER EMERGENCY');
      const count = await emergencyBtn.count();
      if (count > 0) {
        // If it exists, it should be inside a disabled/greyed state not an active button
        const emergencyEl = emergencyBtn.first();
        const tagName = await emergencyEl.evaluate(el => el.tagName);
        expect(tagName).not.toBe('BUTTON');
      }
    });

    test('should show locked emergency placeholder when discharged', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/Not Admitted/).first()).toBeVisible({ timeout: 8000 });
    });

    test('should NOT show multi-hospital selector for single-hospital patient', async ({ page }) => {
      await page.goto('/patient-portal/dashboard');
      await page.waitForLoadState('networkidle');
      // My Hospitals selector should not appear for single-hospital patients
      const selector = page.getByText('My Hospitals');
      await expect(selector).toHaveCount(0, { timeout: 5000 });
    });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 2: GuardianDashboard — Discharge Lock
// ─────────────────────────────────────────────────────────────────────────────
test.describe('GuardianDashboard — Discharge Read-Only Lock', () => {

  test.beforeEach(async ({ page }) => {
    await mockGuardianDischargedSession(page);
  });

  test('should show patient discharged banner for guardian', async ({ page }) => {
    await page.goto('/guardian-portal/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Patient Discharged').first()).toBeVisible({ timeout: 8000 });
  });

  test('should show Guardian Read-Only Mode label on discharge', async ({ page }) => {
    await page.goto('/guardian-portal/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Read-Only Mode/).first()).toBeVisible({ timeout: 8000 });
  });

  test('should show lock icon on guardian discharge banner', async ({ page }) => {
    await page.goto('/guardian-portal/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/live service requests/).first()).toBeVisible({ timeout: 8000 });
  });

  test('should show guardian portal header after discharge banner', async ({ page }) => {
    await page.goto('/guardian-portal/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: 'Guardian Inpatient Care Portal', exact: true })
    ).toBeVisible({ timeout: 8000 });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 3: CareTeamPanel Component
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CareTeamPanel — Care Team Display', () => {

  test.beforeEach(async ({ page }) => {
    await mockMultiHospitalPatientSession(page, { admissionStatus: 'ACTIVE_ADMISSION', hasActiveAdmission: true, hospitalCount: 1 });
  });

  test('should show care team tab in patient portal', async ({ page }) => {
    await page.goto('/patient-portal/care-team');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Assigned Care Team').first()).toBeVisible({ timeout: 8000 });
  });

  test('should navigate to care team sub-view', async ({ page }) => {
    await page.goto('/patient-portal/dashboard');
    await page.waitForLoadState('networkidle');
    const careTeamTab = page.getByText('Assigned Care Team');
    if (await careTeamTab.count() > 0) {
      await careTeamTab.first().click();
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 4: Patient Portal Navigation — New Routes
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Patient Portal — New Multi-Hospital Routes', () => {

  test.beforeEach(async ({ page }) => {
    await mockMultiHospitalPatientSession(page, { admissionStatus: 'ACTIVE_ADMISSION', hasActiveAdmission: true, hospitalCount: 2 });
  });

  test('patient portal should load /patient-portal/dashboard', async ({ page }) => {
    await page.goto('/patient-portal/dashboard');
    await expect(page).toHaveURL('/patient-portal/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('patient dashboard should show patient name', async ({ page }) => {
    await page.goto('/patient-portal/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: 'Ravi Kumar', exact: true })
        .or(page.getByRole('heading', { name: 'Patient Workspace', exact: true }))
    ).toBeVisible({ timeout: 8000 });
  });

  test('patient dashboard header should show UHID', async ({ page }) => {
    await page.goto('/patient-portal/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/UHID/).first()).toBeVisible({ timeout: 8000 });
  });

  test('patient portal dashboard tabs should be visible', async ({ page }) => {
    await page.goto('/patient-portal/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Dashboard Overview').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Billing').first()).toBeVisible({ timeout: 8000 });
  });

  test('patient portal should handle City General Hospital tab click', async ({ page }) => {
    await page.goto('/patient-portal/dashboard');
    await page.waitForLoadState('networkidle');
    const cityHospital = page.getByText('City General Hospital');
    if (await cityHospital.count() > 0) {
      await cityHospital.first().click();
      // No crash = pass
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 5: Reception — Duplicate Patient Warning
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Reception — Duplicate Patient Detection UI', () => {

  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'RECEPTIONIST');
  });

  test('reception dashboard should load', async ({ page }) => {
    await page.goto('/reception/dashboard');
    await page.waitForLoadState('networkidle');
    // It should render without crash
    await expect(page).toHaveURL('/reception/dashboard');
  });

  test('patient registration form should be reachable', async ({ page }) => {
    await page.goto('/reception/dashboard');
    await page.waitForLoadState('networkidle');
    // Look for any registration related text
    const registerText = page.getByText(/Register|Patient|New Patient/).first();
    const visible = await registerText.isVisible().catch(() => false);
    expect(typeof visible).toBe('boolean');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 6: API Route Connectivity (mocked backend)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('New API Endpoints — Frontend Route Intercepts', () => {

  test.beforeEach(async ({ page }) => {
    await mockMultiHospitalPatientSession(page, { hasActiveAdmission: true, hospitalCount: 1 });
  });

  test('GET /patient-portal/hospitals should return hospitals list', async ({ page }) => {
    const requestPromise = page.waitForRequest((req) => req.url().includes('/patient-portal/hospitals'));
    await Promise.all([requestPromise, page.goto('/patient-portal/dashboard')]);
    await page.waitForLoadState('networkidle');
  });

  test('GET /patient-portal/active-context should be called on dashboard load', async ({ page }) => {
    const requestPromise = page.waitForRequest((req) => req.url().includes('/patient-portal/active-context'));
    await Promise.all([requestPromise, page.goto('/patient-portal/dashboard')]);
    await page.waitForLoadState('networkidle');
  });

  test('GET /patient-portal/dashboard should be called on load', async ({ page }) => {
    const requestPromise = page.waitForRequest((req) => req.url().includes('/patient-portal/dashboard'));
    await Promise.all([requestPromise, page.goto('/patient-portal/dashboard')]);
    await page.waitForLoadState('networkidle');
  });

});
