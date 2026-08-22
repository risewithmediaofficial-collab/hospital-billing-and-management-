import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const requestsUrl = new URL('../src/domains/requests/requests.service.js', import.meta.url);
const workflowUrl = new URL('../src/events/workflowEventService.js', import.meta.url);
const portalControllerUrl = new URL('../src/domains/patient-portal/patient-portal.controller.js', import.meta.url);
const guardianRoutesUrl = new URL('../src/domains/guardian-portal/guardian-portal.routes.js', import.meta.url);
const guardianServiceUrl = new URL('../src/domains/guardian-portal/guardian-portal.service.js', import.meta.url);
const requestRoutesUrl = new URL('../src/domains/requests/requests.routes.js', import.meta.url);

test('bedside requests reject arbitrary types and require an active tenant-branch admission', async () => {
  const source = await readFile(requestsUrl, 'utf8');

  assert.match(source, /ALLOWED_REQUEST_TYPES\.has\(requestType\)/);
  assert.match(source, /INVALID_REQUEST_TYPE/);
  assert.match(source, /branchId: resolvedBranchId,[\s\S]*patientId,[\s\S]*status: 'ADMITTED'/);
  assert.match(source, /\['NURSE', 'CARETAKER', 'EMERGENCY'\]\.includes\(category\) && !activeAdm/);
  assert.match(source, /ACTIVE_ADMISSION_REQUIRED/);
});

test('patient care notifications are distinct from doctor-authored nurse tasks and target exact assignees', async () => {
  const [requests, workflow] = await Promise.all([
    readFile(requestsUrl, 'utf8'),
    readFile(workflowUrl, 'utf8'),
  ]);

  assert.match(requests, /WORKFLOW_EVENTS\.PATIENT_CARE_REQUEST_RAISED/);
  assert.match(requests, /recipientUserIds: assignedRecipientId \? \[String\(assignedRecipientId\)\] : \[\]/);
  assert.match(requests, /tab=REQUESTS&requestId=\$\{request\._id\}/);
  assert.match(workflow, /entityType: 'PatientRequest', idKey: 'requestId'/);
  assert.match(workflow, /explicitRecipientIds/);
});

test('guardian and patient request history remains explicitly hospital scoped', async () => {
  const controller = await readFile(portalControllerUrl, 'utf8');
  assert.match(controller, /PatientRequest\.find\(\{ hospitalId: req\.user\.hospitalId, patientId: patient\._id \}\)/);
});

test('guardian self-service and hospital approval routes use exact role boundaries', async () => {
  const [guardianRoutes, requestRoutes] = await Promise.all([
    readFile(guardianRoutesUrl, 'utf8'),
    readFile(requestRoutesUrl, 'utf8'),
  ]);
  assert.match(guardianRoutes, /guardianOnly, GuardianPortalController\.requestLink/);
  assert.match(guardianRoutes, /hospitalGovernanceOnly, GuardianPortalController\.updateLinkStatus/);
  assert.match(guardianRoutes, /patch\('\/links\/:linkId\/status'/);
  assert.match(requestRoutes, /requireExactRole\('PATIENT'\), createRequest/);
  assert.match(requestRoutes, /requireExactRole\('DOCTOR', 'NURSE', 'NURSE_INCHARGE'/);
});

test('guardian links persist only schema-valid relationships', async () => {
  const [guardian, auth] = await Promise.all([
    readFile(guardianServiceUrl, 'utf8'),
    readFile(new URL('../src/domains/auth/auth.service.js', import.meta.url), 'utf8'),
  ]);
  assert.match(guardian, /GUARDIAN_RELATIONSHIPS/);
  assert.match(guardian, /INVALID_RELATIONSHIP/);
  assert.doesNotMatch(guardian, /relationship: 'GUARDIAN'/);
  assert.doesNotMatch(auth, /relationship: 'GUARDIAN'/);
});

test('guardian doctor messages require an approved live link and route to the attending doctor', async () => {
  const [guardian, requests, workflow] = await Promise.all([
    readFile(guardianServiceUrl, 'utf8'),
    readFile(requestsUrl, 'utf8'),
    readFile(workflowUrl, 'utf8'),
  ]);
  assert.match(guardian, /accessStatus: 'APPROVED'/);
  assert.match(guardian, /liveAccessActive: \{ \$ne: false \}/);
  assert.match(guardian, /requestType: 'DOCTOR'/);
  assert.match(guardian, /ATTENDING_DOCTOR_REQUIRED/);
  assert.match(guardian, /status: 'ADMITTED',[\s\S]*doctorId: \{ \$ne: null \}/);
  assert.match(requests, /request\.assignedDoctorId/);
  assert.match(workflow, /PATIENT_DOCTOR_REQUEST_RAISED/);
  assert.match(workflow, /tab=DEPT_RESPONSES[\s\S]*requestId/);
});
