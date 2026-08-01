/**
 * Helper to mock authenticated sessions for Playwright tests.
 * Sets localStorage token/user and intercepts /api/v1 API calls with rich mock data.
 */
export async function mockAuthSession(page, role = 'SUPER_ADMIN') {
  const user = {
    id: 'test-user-id',
    name: 'Test Workspace User',
    email: 'user@hospital.com',
    role: role,
    permissions: { '*': ['*'] },
    enabledModules: {},
  };

  const mockPatient = {
    _id: 'test-patient-id',
    firstName: 'John',
    lastName: 'Doe',
    uhid: 'HOSP-00042',
    phone: '+1 (555) 000-0000',
    email: 'user@hospital.com',
    gender: 'MALE',
    age: 35,
    category: 'GENERAL',
    bloodGroup: 'O+',
    address: '123 Health Ave',
    city: 'Metropolis',
  };

  // Intercept all backend API calls under /api/v1/
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: user }),
      });
    } else if (url.includes('dashboard')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            patient: mockPatient,
            currentStatus: 'UNDER_CARE',
            queuePosition: '#101',
            pendingLabs: 0,
            pendingRadiology: 0,
            totalPendingAmount: 0,
            hasLinkedPatient: true,
            relationship: 'FATHER',
            permissions: {
              patientOverview: true,
              treatmentHistory: true,
              doctorUpdates: true,
              billing: true,
              patientRequests: true,
            },
            patientSummary: {
              patient: mockPatient,
              currentStatus: 'UNDER_CARE',
              totalPendingAmount: 0,
            },
            doctorUpdates: [],
            careTeam: {
              doctor: { name: 'Sarah Jenkins', specialization: 'General Medicine', cabinNo: 'Cabin 101' },
              nurse: { name: 'Nurse Joy', role: 'NURSE' },
            },
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
  });

  // Inject token and user object into localStorage before page load
  await page.addInitScript(({ mockUser }) => {
    window.localStorage.setItem('hpmbs_access_token', 'mock-jwt-token-12345');
    window.localStorage.setItem('hpmbs_user', JSON.stringify(mockUser));
  }, { mockUser: user });
}
