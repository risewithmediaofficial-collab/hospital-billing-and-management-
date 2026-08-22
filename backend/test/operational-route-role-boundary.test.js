import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('exact operational role middleware has no governance override', async () => {
  const permissions = await source('../src/middleware/permissions.js');
  const exact = permissions.slice(permissions.indexOf('export const requireAssignedRole'), permissions.indexOf('export const requirePermission'));
  assert.match(exact, /allowedRoles\.some/);
  assert.doesNotMatch(exact, /SUPER_ADMIN|HOSPITAL_ADMIN|ADMIN/);
});

test('department mutations are separated by the role that performs each workflow stage', async () => {
  const [appointments, diagnostics, billing, pharmacy] = await Promise.all([
    source('../src/domains/appointments/appointments.routes.js'),
    source('../src/domains/diagnostics/diagnostics.routes.js'),
    source('../src/domains/billing/billing.routes.js'),
    source('../src/domains/pharmacy/pharmacy.routes.js'),
  ]);
  assert.match(appointments, /post\('\/tokens', requireAssignedRole\('RECEPTIONIST', 'OPD_STAFF'\)/);
  assert.match(diagnostics, /post\('\/request', requireAssignedRole\('DOCTOR'\)/);
  assert.match(diagnostics, /post\('\/orders\/:id\/report', requireAssignedRole\('LAB_TECH', 'LABORATORY_STAFF', 'RADIOLOGIST', 'RADIOLOGY_STAFF'\)/);
  assert.match(billing, /post\('\/payments\/receipts', requireAssignedRole\('CASHIER', 'BILLING_STAFF'\)/);
  assert.match(pharmacy, /patch\('\/substitutions\/:id\/respond', requireAssignedRole\('DOCTOR'\)/);
  assert.match(pharmacy, /patch\('\/nurse-tasks\/:id\/status', requireAssignedRole\('NURSE', 'NURSE_INCHARGE'\)/);
});

test('admission, registration, bed, emergency, and clinical-note mutations require assigned staff roles', async () => {
  const [admissions, patients, beds, emergency, updates, emr] = await Promise.all([
    source('../src/domains/admissions/admissions.routes.js'),
    source('../src/domains/patients/patients.routes.js'),
    source('../src/domains/beds/beds.routes.js'),
    source('../src/domains/emergency/emergency.routes.js'),
    source('../src/domains/doctor-updates/doctor-updates.routes.js'),
    source('../src/domains/emr/emr.routes.js'),
  ]);
  assert.match(admissions, /post\('\/request', requireAssignedRole\('DOCTOR'\)/);
  assert.match(admissions, /allocate-bed', requireAssignedRole\('NURSE_INCHARGE', 'IPD_STAFF'\)/);
  assert.match(patients, /post\('\/', requireAssignedRole\('RECEPTIONIST', 'OPD_STAFF'\)/);
  assert.match(beds, /const manageBedStructure = requireAssignedRole\('NURSE_INCHARGE', 'IPD_STAFF'\)/);
  assert.match(emergency, /resolve', requireAssignedRole\('DOCTOR', 'NURSE', 'NURSE_INCHARGE', 'EMERGENCY_STAFF'\)/);
  assert.match(updates, /post\('\/', requireAssignedRole\('DOCTOR'\)/);
  assert.match(emr, /post\('\/consultations', requireAssignedRole\('DOCTOR'\)/);
});
