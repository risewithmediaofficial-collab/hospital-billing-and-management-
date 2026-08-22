import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const jwtUrl = new URL('../src/middleware/verifyJwt.js', import.meta.url);
const patientRoutesUrl = new URL('../src/domains/patient-portal/patient-portal.routes.js', import.meta.url);
const guardianRoutesUrl = new URL('../src/domains/guardian-portal/guardian-portal.routes.js', import.meta.url);
const workflowServiceUrl = new URL('../src/domains/workflow/workflow.service.js', import.meta.url);
const permissionsMiddlewareUrl = new URL('../src/middleware/permissions.js', import.meta.url);

test('patient and guardian accounts are not exempt from operational module permissions', async () => {
  const jwt = await readFile(jwtUrl, 'utf8');
  assert.match(jwt, /if \(module && decoded\.role !== 'SUPER_ADMIN' && currentUser\)/);
  assert.doesNotMatch(jwt, /!isPortalRole/);
  assert.match(jwt, /\['\/doctor-updates', 'doctor'\]/);
});

test('governance roles do not aggregate operational pending-work queues', async () => {
  const workflow = await readFile(workflowServiceUrl, 'utf8');
  assert.doesNotMatch(workflow, /isSupervisorOrAdmin/);
  assert.doesNotMatch(workflow, /\|\|\s*userRoles\.has\('HOSPITAL_ADMIN'\)/);
  assert.match(workflow, /if \(userRoles\.has\('HOSPITAL_ADMIN'\)\)/);
  assert.match(workflow, /if \(userRoles\.has\('SUPER_ADMIN'\)\)/);
  assert.match(workflow, /BILLING_WORK: 'invoiceId'/);
  assert.match(workflow, /\$\{idKey\}=\$\{encodeURIComponent\(resourceId\)\}/);
});

test('pending-work database failures are not disguised as empty queues', async () => {
  const workflow = await readFile(workflowServiceUrl, 'utf8');
  const pendingWorkSource = workflow.split('static async getPendingWork(user)')[1]
    .split('static async getHospitalDataJourney')[0];

  assert.doesNotMatch(pendingWorkSource, /\.catch\(\(\) => \[\]\)/);
  assert.doesNotMatch(pendingWorkSource, /return \{ total: 0, byPath: \{\}, tasks: \[\] \};\s*\}\s*catch/);
});

test('portal routes require the exact portal identity and cannot be opened by governance users', async () => {
  const [patientRoutes, guardianRoutes] = await Promise.all([
    readFile(patientRoutesUrl, 'utf8'),
    readFile(guardianRoutesUrl, 'utf8'),
  ]);
  assert.match(patientRoutes, /req\.user\?\.role !== 'PATIENT'/);
  assert.match(patientRoutes, /router\.use\(patientOnly\)/);
  assert.match(guardianRoutes, /const guardianOnly = requireExactRole\('GUARDIAN'\)/);
  assert.match(guardianRoutes, /const hospitalGovernanceOnly = requireExactRole\('HOSPITAL_ADMIN'\)/);
});

test('generic role middleware never promotes Hospital Admin to SuperAdmin', async () => {
  const source = await readFile(permissionsMiddlewareUrl, 'utf8');
  const genericRoleSource = source.split('export const requireRole')[1].split('export const requireAssignedRole')[0];
  assert.match(genericRoleSource, /userRoles\.includes\('SUPER_ADMIN'\)/);
  assert.doesNotMatch(genericRoleSource, /userRoles\.includes\('HOSPITAL_ADMIN'\)/);
  assert.doesNotMatch(genericRoleSource, /userRoles\.includes\('ADMIN'\)/);
});
