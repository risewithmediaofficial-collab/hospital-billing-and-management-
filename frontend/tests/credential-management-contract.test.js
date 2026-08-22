import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('admin portals reset passwords and never call a password-retrieval API', async () => {
  const sources = await Promise.all([
    read('pages/Dashboards/HospitalAdminDashboard.jsx'),
    read('pages/SuperAdmin/SuperAdminHospitalDashboard.jsx'),
    read('pages/SuperAdmin/SuperAdminReportsPage.jsx'),
    read('pages/SuperAdmin/SuperAdminHospitalsPage.jsx'),
  ]);
  const combined = sources.join('\n');

  assert.doesNotMatch(combined, /\/view-password/);
  assert.doesNotMatch(combined, /HospitalAdmin123!/);
  assert.doesNotMatch(combined, /Current Password Hint/);
  assert.match(combined, /Secure hash only/);
  assert.match(combined, /Current passwords are never retrievable/);
});

test('password creation and reset interfaces enforce the backend minimum', async () => {
  const sources = await Promise.all([
    read('pages/Auth/ResetPasswordPage.jsx'),
    read('pages/SuperAdmin/SuperAdminHospitalDashboard.jsx'),
    read('pages/SuperAdmin/SuperAdminReportsPage.jsx'),
    read('pages/SuperAdmin/SuperAdminHospitalsPage.jsx'),
  ]);
  for (const source of sources) assert.match(source, /(?:length|trim\(\)\.length) < 8/);
});
