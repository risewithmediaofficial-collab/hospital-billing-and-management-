import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authServiceUrl = new URL('../src/domains/auth/auth.service.js', import.meta.url);
const userModelUrl = new URL('../src/models/User.js', import.meta.url);
const authRoutesUrl = new URL('../src/domains/auth/auth.routes.js', import.meta.url);
const saasServiceUrl = new URL('../src/domains/saas/saas.service.js', import.meta.url);
const hospitalModelUrl = new URL('../src/models/Hospital.js', import.meta.url);
const autoSeedUrl = new URL('../src/config/autoSeed.js', import.meta.url);

test('password authentication uses only the password hash with no demo or plaintext bypass', async () => {
  const user = await readFile(userModelUrl, 'utf8');
  const compareMethod = user.slice(user.indexOf('userSchema.methods.comparePassword'), user.indexOf('userSchema.methods.generateAccessToken'));

  assert.match(compareMethod, /bcrypt\.compare\(enteredPassword, this\.passwordHash\)/);
  assert.doesNotMatch(compareMethod, /assignedPasswordHint/);
  assert.doesNotMatch(compareMethod, /superadmin@gmail\.com|admin@citygeneral\.com|'0000'|'1234'/);
});

test('hospital staff mutations never retry a failed scoped lookup globally', async () => {
  const auth = await readFile(authServiceUrl, 'utf8');

  assert.match(auth, /staffManagementFilter\(staffId, requestingUser\)/);
  assert.match(auth, /return \{ _id: staffId, hospitalId \}/);
  assert.doesNotMatch(auth, /if \(!staff\) staff = await User\.findById/);
  assert.doesNotMatch(auth, /HospitalAdmin123!|SuperAdmin123!|adminPassword === '0000'/);
});

test('passwords are resettable but never exposed through a retrieval endpoint', async () => {
  const [routes, auth, saas] = await Promise.all([
    readFile(authRoutesUrl, 'utf8'),
    readFile(authServiceUrl, 'utf8'),
    readFile(saasServiceUrl, 'utf8'),
  ]);

  assert.doesNotMatch(routes, /view-password|getStaffPassword/);
  assert.match(routes, /patch\('\/staff\/:id\/password'/);
  assert.match(auth, /New password must be at least 8 characters long/);
  assert.doesNotMatch(auth.slice(auth.indexOf('static async updateStaffPassword'), auth.indexOf('static async toggleDoctorAvailability')), /newPassword,\s*\n\s*\}/);
  assert.match(saas, /select\('-passwordHash -assignedPasswordHint -passwordResetToken -emailVerificationToken'\)/);
  assert.doesNotMatch(saas, /credentialHint,/);
});

test('new hospital registration stores an inactive bcrypt administrator instead of plaintext', async () => {
  const [saas, hospital] = await Promise.all([
    readFile(saasServiceUrl, 'utf8'),
    readFile(hospitalModelUrl, 'utf8'),
  ]);

  const registration = saas.slice(saas.indexOf('static async registerHospital'), saas.indexOf('static async getAllHospitals'));
  assert.match(registration, /passwordHash: await bcrypt\.hash\(String\(data\.adminPassword\), 12\)/);
  assert.match(registration, /status: 'INACTIVE'/);
  assert.match(registration, /isActive: false/);
  assert.doesNotMatch(registration, /initialAdminPassword|assignedPasswordHint|adminInitialPassword/);
  assert.match(hospital, /initialAdminPassword: \{ type: String, default: null, select: false \}/);
});

test('server bootstrap never installs known credentials or production test data', async () => {
  const autoSeed = await readFile(autoSeedUrl, 'utf8');

  assert.match(autoSeed, /SUPER_ADMIN_BOOTSTRAP_PASSWORD/);
  assert.match(autoSeed, /bootstrapPassword\.length < 12/);
  assert.doesNotMatch(autoSeed, /const defaultPassword|\/ 0000|passwordHash:\s*defaultHash/);
  assert.match(autoSeed, /process\.env\.NODE_ENV !== 'production' && process\.env\.ENABLE_TEST_DATA_SEED === 'true'/);
  assert.doesNotMatch(autoSeed, /^import .*seed-production-test-hospital/m);
});
