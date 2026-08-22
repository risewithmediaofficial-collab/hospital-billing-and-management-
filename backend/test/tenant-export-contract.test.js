import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { safeExportJson } from '../src/domains/saas/tenantExport.service.js';

test('tenant export strips authentication and recovery secrets', () => {
  const serialized = safeExportJson({
    email: 'admin@hospital.test',
    passwordHash: 'bcrypt-secret',
    nested: { resetPasswordToken: 'reset-secret', clinicalValue: 'preserved' },
  });
  assert.doesNotMatch(serialized, /bcrypt-secret|reset-secret|passwordHash|resetPasswordToken/);
  assert.match(serialized, /admin@hospital\.test/);
  assert.match(serialized, /clinicalValue/);
});

test('tenant export is exact-admin authorized, hospital scoped, and streaming', async () => {
  const [service, routes, controller, saasService] = await Promise.all([
    readFile(new URL('../src/domains/saas/tenantExport.service.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/domains/saas/saas.routes.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/domains/saas/saas.controller.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/domains/saas/saas.service.js', import.meta.url), 'utf8'),
  ]);

  assert.match(routes, /router\.get\('\/hospitals\/:id\/export', verifyJwt, exportHospitalData\)/);
  assert.match(service, /role !== 'HOSPITAL_ADMIN'/);
  assert.match(service, /user\?\.hospitalId\?\._id \|\| user\?\.hospitalId/);
  assert.match(service, /hospitalId: \{ \$in: \[hospital\._id, String\(hospital\._id\)\] \}/);
  assert.match(service, /hospital\.storageMode === 'DEDICATED'/);
  assert.match(controller, /for await \(const record of exportJob\.records\(\)\)/);
  assert.match(controller, /Cache-Control', 'private, no-store'/);
  assert.match(routes, /router\.get\('\/hospitals\/:id\/detail', verifyJwt, getHospitalDetail\)/);
  assert.match(saasService, /You may view only the hospital tenant you administer/);
});
