import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const dashboardFile = path.resolve(testDirectory, '../src/pages/SuperAdmin/SuperAdminHospitalDashboard.jsx');
const hospitalAdminFile = path.resolve(testDirectory, '../src/pages/Dashboards/HospitalAdminDashboard.jsx');
const renewalModalFile = path.resolve(testDirectory, '../src/components/subscription/SubscriptionRenewalModal.jsx');

test('super admin hospital dashboard exposes the two-stage dedicated database workflow', async () => {
  const source = await readFile(dashboardFile, 'utf8');

  assert.match(source, /data-testid="tenant-database-card"/);
  assert.match(source, /data-testid="prepare-tenant-database"/);
  assert.match(source, /data-testid="activate-tenant-database"/);
  assert.match(source, /`\/saas\/hospitals\/\$\{hospitalId\}\/database\/\$\{action\}`/);
  assert.match(source, /runDatabaseAction\('prepare'\)/);
  assert.match(source, /runDatabaseAction\('activate'\)/);
});

test('hospital admin can export an expired tenant without a blocking renewal wall', async () => {
  const [dashboard, renewalModal] = await Promise.all([
    readFile(hospitalAdminFile, 'utf8'),
    readFile(renewalModalFile, 'utf8'),
  ]);

  assert.match(dashboard, /\/saas\/hospitals\/\$\{hospitalId\}\/export/);
  assert.match(dashboard, /responseType: 'blob'/);
  assert.match(dashboard, /Export Hospital Data/);
  assert.match(dashboard, /Subscription expired — read-only access/);
  assert.match(dashboard, /isOpen=\{isRenewalModalOpen\}/);
  assert.doesNotMatch(dashboard, /isOpen=\{isRenewalModalOpen \|\|/);
  assert.match(renewalModal, /aria-label="Close renewal plans"/);
});

test('activation remains disabled until a pending database copy is verified', async () => {
  const source = await readFile(dashboardFile, 'utf8');

  assert.match(
    source,
    /hospital\.storageMode !== 'DEDICATED_PENDING' \|\| hospital\.databaseMigrationStatus !== 'COPY_PREPARED'/,
  );
  assert.match(source, /hospital\.storageMode !== 'DEDICATED'/);
  assert.match(source, /New hospital writes will be paused briefly while the final changes are copied and verified/);
});
