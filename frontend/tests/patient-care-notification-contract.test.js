import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const patientDashboardUrl = new URL('../src/pages/Dashboards/PatientDashboard.jsx', import.meta.url);
const nursingDashboardUrl = new URL('../src/pages/Dashboards/NurseInchargeDashboard.jsx', import.meta.url);
const sidebarUrl = new URL('../src/components/layout/Sidebar.jsx', import.meta.url);
const guardianDashboardUrl = new URL('../src/pages/Dashboards/GuardianDashboard.jsx', import.meta.url);
const guardianManagementUrl = new URL('../src/components/modals/GuardianManagementModal.jsx', import.meta.url);
const doctorDashboardUrl = new URL('../src/pages/Dashboards/DoctorDashboard.jsx', import.meta.url);

test('patient bedside actions are unavailable without an active admission', async () => {
  const source = await readFile(patientDashboardUrl, 'utf8');
  assert.match(source, /if \(!hasActiveAdmission\)[\s\S]*In-bed care requests require an active admission/);
  assert.match(source, /\{hasActiveAdmission \? <Card>/);
  assert.match(source, /In-Bed Care Requests Unavailable/);
});

test('guardian messages use the approved workflow and never report success after a swallowed failure', async () => {
  const [guardian, management, doctor] = await Promise.all([
    readFile(guardianDashboardUrl, 'utf8'),
    readFile(guardianManagementUrl, 'utf8'),
    readFile(doctorDashboardUrl, 'utf8'),
  ]);
  assert.match(guardian, /post\('\/guardian-portal\/doctor-message'/);
  assert.doesNotMatch(guardian, /patient-requests\/request|\.catch\(\(\) => null\)/);
  assert.match(management, /handleStatusUpdate\(link\._id, 'APPROVED'\)/);
  assert.match(management, /\{ status: action \}/);
  assert.match(doctor, /get\('requestId'\)/);
  assert.match(doctor, /doctor-patient-request-/);
});

test('patient-care notification opens and highlights its exact nursing request', async () => {
  const [nursing, sidebar] = await Promise.all([
    readFile(nursingDashboardUrl, 'utf8'),
    readFile(sidebarUrl, 'utf8'),
  ]);

  assert.match(nursing, /get\('requestId'\)/);
  assert.match(nursing, /id=\{`patient-request-\$\{req\._id\}`\}/);
  assert.match(sidebar, /data\.targetRoute \|\| data\.linkedPath \|\| data\.payload\?\.linkedPath \|\| workflowPaths/);
  assert.match(sidebar, /PATIENT_CARE_REQUEST_RAISED/);
});

test('critical operational dashboards surface API failures instead of showing false empty data', async () => {
  const files = await Promise.all([
    readFile(new URL('../src/pages/Dashboards/PharmacistDashboard.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Dashboards/NurseInchargeDashboard.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Dashboards/BedMatrixPage.jsx', import.meta.url), 'utf8'),
  ]);
  files.forEach((source) => {
    assert.match(source, /role="alert"/);
    assert.match(source, /setLoadError/);
  });
  assert.doesNotMatch(files[0], /axiosClient\.get\('\/pharmacy\/prescriptions'\)\.catch/);
  assert.doesNotMatch(files[1], /axiosClient\.get\('\/requests'\)\.catch/);
  assert.doesNotMatch(files[2], /axiosClient\.get\('\/beds'\)\.catch/);
});
