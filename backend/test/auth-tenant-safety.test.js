import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.resolve(directory, '../src/domains/auth/auth.service.js');

test('patient authentication never falls back to an arbitrary patient or another hospital', async () => {
  const source = await readFile(authFile, 'utf8');

  assert.doesNotMatch(source, /Patient\.findOne\(\{\s*\}\)/);
  assert.doesNotMatch(source, /patients\s*=\s*await Patient\.find\(\{ \$or: phoneQueries \}\)/);
  assert.doesNotMatch(source, /matchedPatient\s*=\s*patients\[0\]/);
  assert.match(source, /Date of Birth \(DOB\) does not match patient records/);
});

test('guardian authentication requires both exact patient and registered guardian phones', async () => {
  const source = await readFile(authFile, 'utf8');

  assert.doesNotMatch(source, /patient\s*=\s*await Patient\.findOne\(\{\s*\}\)/);
  assert.doesNotMatch(source, /guardianMatched[^;]+patientMatched/);
  assert.match(source, /Guardian Mobile Number does not match the registered emergency contact/);
  assert.match(source, /uhid: cleanUHID,[\s\S]*targetHospital \? \{ hospitalId: targetHospital\._id \}/);
});

test('dedicated tenant login activates only a prepared request-local database context', async () => {
  const source = await readFile(authFile, 'utf8');

  assert.match(source, /hospital\.databaseMigrationStatus !== 'COPY_PREPARED'/);
  assert.match(source, /tenantRuntimeReadiness\(\)/);
  assert.match(source, /setTenantModelConnection/);
});

test('patient portal resolver never assigns the first patient as a fallback', async () => {
  const portalSource = await readFile(
    path.resolve(directory, '../src/domains/patient-portal/patient-portal.service.js'),
    'utf8',
  );
  assert.doesNotMatch(portalSource, /Patient\.findOne\(\s*\{\s*\}\s*\)/);
  assert.doesNotMatch(portalSource, /Patient\.findOne\(\{ hospitalId: user\.hospitalId \}\)/);
  assert.match(portalSource, /_id: user\.patientId, hospitalId/);
});
